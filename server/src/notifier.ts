import {
  fetchActiveRunsForRepos,
  tryGetInputsForRun,
  type WorkflowRun,
} from './githubPoll.js'
import { buildRunMessage, sendTeamsMessage } from './teams.js'
import { getConfig } from './notifierConfig.js'

const POLL_INTERVAL_MS = 60_000
const MAX_WAIT_FOR_INPUTS_MS = 90_000
const FIRST_SEEN_TTL_MS = 60 * 60 * 1000
const FIRST_SEEN_CLEANUP_INTERVAL_MS = 10 * 60 * 1000
const REPO_REFRESH_INTERVAL_MS = 10 * 60 * 1000
const INPUT_KEYS = ['ENVIRONMENT', 'SUBSCRIPTION'] as const

export interface RepoSpec {
  owner: string
  repo: string
}

export interface NotifierHandle {
  stop: () => void
}

interface NotifierState {
  notifiedRunIds: Set<number>
  firstSeenAt: Map<number, number>
  primed: boolean
}

/**
 * Parse the comma-separated MONITORED_REPOS env var into structured repo specs.
 * Format: `owner1/repo1,owner1/repo2`. Whitespace tolerated.
 */
export function parseMonitoredRepos(envValue: string): RepoSpec[] {
  return envValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const slash = entry.indexOf('/')
      if (slash <= 0 || slash === entry.length - 1) {
        console.warn(`[notifier] Ignoring malformed MONITORED_REPOS entry: "${entry}" (expected owner/repo)`)
        return null
      }
      return { owner: entry.slice(0, slash), repo: entry.slice(slash + 1) }
    })
    .filter((x): x is RepoSpec => x !== null)
}

/**
 * Decide whether a run should be notified now. Returns:
 * - 'send' — send notification now (with inputs if we have them).
 * - 'wait' — set-env hasn't yet produced inputs; check again next cycle.
 */
async function decideForRun(
  token: string,
  run: WorkflowRun,
  firstSeenAtMs: number,
  now: number
): Promise<{ action: 'send'; inputs?: Record<string, string | undefined> } | { action: 'wait' }> {
  const elapsed = now - firstSeenAtMs

  // Always send if we've waited long enough.
  if (elapsed > MAX_WAIT_FOR_INPUTS_MS) {
    const result = await tryGetInputsForRun(token, run, INPUT_KEYS).catch(() => null)
    return { action: 'send', inputs: result?.inputs }
  }

  let result: Awaited<ReturnType<typeof tryGetInputsForRun>>
  try {
    result = await tryGetInputsForRun(token, run, INPUT_KEYS)
  } catch (err) {
    console.warn(`[notifier] Failed to inspect inputs for run #${run.run_number} in ${run._owner}/${run._repo}:`, err)
    // Fall through and let it retry next cycle until timeout.
    return { action: 'wait' }
  }

  if (!result.hasSetEnv) return { action: 'send' }
  if (result.ready) return { action: 'send', inputs: result.inputs }
  return { action: 'wait' }
}

async function pollOnce(
  token: string,
  repos: RepoSpec[],
  dashboardUrl: string,
  state: NotifierState
): Promise<void> {
  const runs = await fetchActiveRunsForRepos(token, repos)

  if (!state.primed) {
    runs.forEach((r) => state.notifiedRunIds.add(r.id))
    state.primed = true
    console.log(`[notifier] Primed with ${runs.length} active runs (no notifications sent)`)
    return
  }

  const now = Date.now()
  const config = getConfig()

  for (const run of runs) {
    if (state.notifiedRunIds.has(run.id)) continue

    if (!state.firstSeenAt.has(run.id)) {
      state.firstSeenAt.set(run.id, now)
      console.log(`[notifier] New run detected: ${run._owner}/${run._repo} #${run.run_number} (${run.status})`)
    }
    const firstSeenMs = state.firstSeenAt.get(run.id)!

    const decision = await decideForRun(token, run, firstSeenMs, now)
    if (decision.action === 'wait') continue

    // Mark as notified BEFORE sending so a Teams hiccup doesn't cause re-spam on the next poll.
    state.notifiedRunIds.add(run.id)

    if (!config.enabled || !config.webhookUrl) {
      console.log(`[notifier] Run ${run._owner}/${run._repo} #${run.run_number} ready, but notifications are disabled or no webhook configured`)
      continue
    }

    const payload = buildRunMessage(run, decision.inputs, dashboardUrl)
    try {
      await sendTeamsMessage(config.webhookUrl, payload)
      const envSub = decision.inputs
        ? ` env=${decision.inputs.ENVIRONMENT ?? '?'} sub=${decision.inputs.SUBSCRIPTION ?? '?'}`
        : ''
      console.log(`[notifier] Notification sent: ${run._owner}/${run._repo} #${run.run_number}${envSub}`)
    } catch (err) {
      console.error(`[notifier] Teams send failed for ${run._owner}/${run._repo} #${run.run_number}:`, err)
    }
  }
}

function cleanupFirstSeen(state: NotifierState): void {
  const cutoff = Date.now() - FIRST_SEEN_TTL_MS
  let removed = 0
  for (const [runId, ts] of state.firstSeenAt) {
    if (ts < cutoff) {
      state.firstSeenAt.delete(runId)
      removed++
    }
  }
  if (removed > 0) {
    console.log(`[notifier] Cleaned up ${removed} stale firstSeenAt entries`)
  }
}

/**
 * Start the background notifier loop. Returns a handle with `stop()` to cancel.
 *
 * The first poll is a "priming" pass that records currently-active runs without
 * sending any notifications, so a server restart doesn't re-spam everything.
 *
 * `repoSource` is either a fixed list or a resolver function. If a resolver is
 * provided, it's invoked at startup AND every 10 minutes to pick up newly-added
 * repos without requiring a server restart.
 */
export function startNotifier(
  token: string,
  repoSource: RepoSpec[] | { resolve: () => Promise<RepoSpec[]>; label: string },
  dashboardUrl: string
): NotifierHandle {
  const state: NotifierState = {
    notifiedRunIds: new Set<number>(),
    firstSeenAt: new Map<number, number>(),
    primed: false,
  }

  let stopped = false
  let currentRepos: RepoSpec[] = Array.isArray(repoSource) ? repoSource : []
  const isDynamic = !Array.isArray(repoSource)

  const refreshRepos = async (): Promise<void> => {
    if (Array.isArray(repoSource)) return
    try {
      const fresh = await repoSource.resolve()
      const before = currentRepos.length
      currentRepos = fresh
      if (fresh.length !== before) {
        console.log(`[notifier] Repo list refreshed: ${fresh.length} repo(s) (was ${before})`)
      }
      if (fresh.length > 50) {
        console.warn(`[notifier] Watching ${fresh.length} repos — this may exceed GitHub rate limits (5000/hr). Consider setting MONITORED_REPOS to narrow it down.`)
      }
    } catch (err) {
      console.error('[notifier] Failed to refresh repo list:', err)
    }
  }

  const tick = async (): Promise<void> => {
    if (stopped) return
    if (currentRepos.length === 0) {
      // Nothing to poll yet (e.g. dynamic resolver hasn't returned its first batch).
      return
    }
    try {
      await pollOnce(token, currentRepos, dashboardUrl, state)
    } catch (err) {
      console.error('[notifier] Poll cycle failed:', err)
    }
  }

  // Kick off: resolve repos first (if dynamic), THEN start polling so the priming
  // pass has the full set on the very first tick.
  void (async () => {
    await refreshRepos()
    if (stopped) return
    console.log(
      `[notifier] Started — monitoring ${currentRepos.length} repo(s)${
        isDynamic ? ` (auto-discovered via ${(repoSource as { label: string }).label})` : ''
      }, poll every ${POLL_INTERVAL_MS / 1000}s`
    )
    void tick()
  })()

  const pollHandle = setInterval(tick, POLL_INTERVAL_MS)
  const cleanupHandle = setInterval(() => cleanupFirstSeen(state), FIRST_SEEN_CLEANUP_INTERVAL_MS)
  const refreshHandle = isDynamic
    ? setInterval(() => void refreshRepos(), REPO_REFRESH_INTERVAL_MS)
    : null

  return {
    stop: () => {
      stopped = true
      clearInterval(pollHandle)
      clearInterval(cleanupHandle)
      if (refreshHandle) clearInterval(refreshHandle)
      console.log('[notifier] Stopped')
    },
  }
}
