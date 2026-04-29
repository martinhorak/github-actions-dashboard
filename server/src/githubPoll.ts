import { findSetEnvJob, type WorkflowJob } from './findSetEnvJob.js'
import { parseInputs } from './parseInputsLog.js'

const ACTIVE_STATUSES = new Set(['in_progress', 'queued', 'waiting', 'requested', 'pending'])

export interface WorkflowRun {
  id: number
  name: string
  display_title?: string
  status: string
  conclusion?: string | null
  html_url: string
  head_branch: string
  head_sha?: string
  event: string
  run_number: number
  triggering_actor?: { login: string } | null
  actor?: { login: string } | null
  _owner: string
  _repo: string
}

interface GitHubRunResponse {
  id: number
  name: string
  display_title?: string
  status: string
  conclusion?: string | null
  html_url: string
  head_branch: string
  head_sha?: string
  event: string
  run_number: number
  triggering_actor?: { login: string } | null
  actor?: { login: string } | null
}

async function ghFetch<T>(url: string, token: string): Promise<T> {
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!resp.ok) {
    throw new Error(`GitHub API ${resp.status} for ${url}`)
  }
  return (await resp.json()) as T
}

async function ghFetchAllPages<T>(baseUrl: string, token: string): Promise<T[]> {
  const all: T[] = []
  let page = 1
  while (true) {
    const sep = baseUrl.includes('?') ? '&' : '?'
    const url = `${baseUrl}${sep}per_page=100&page=${page}`
    const items = await ghFetch<T[]>(url, token)
    if (!Array.isArray(items)) break
    all.push(...items)
    if (items.length < 100) break
    page++
    if (page > 30) {
      // Pagination safety net (3000 items). Real-world repo lists never reach this.
      console.warn(`[notifier] Pagination cut off at page 30 for ${baseUrl}`)
      break
    }
  }
  return all
}

async function ghFetchText(url: string, token: string): Promise<string | null> {
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (resp.status === 404) return null
  if (!resp.ok) {
    throw new Error(`GitHub API ${resp.status} for ${url}`)
  }
  return resp.text()
}

interface OrgRef {
  login: string
}

interface RepoRef {
  name: string
  owner?: { login: string } | null
}

/**
 * Discover all repos the token has access to: personal (owner-affiliated)
 * + all repos in every org the user is a member of.
 *
 * NOTE: this can be a lot of repos. Caller should warn if the list grows large
 * since each repo costs ≥1 API call per 30s polling cycle.
 */
export async function fetchAllAccessibleRepos(
  token: string
): Promise<{ owner: string; repo: string }[]> {
  const seen = new Set<string>()
  const result: { owner: string; repo: string }[] = []

  const addRepo = (owner: string | undefined, name: string) => {
    if (!owner || !name) return
    const key = `${owner}/${name}`
    if (seen.has(key)) return
    seen.add(key)
    result.push({ owner, repo: name })
  }

  // Personal repos (owner-affiliated only — avoids pulling every collaborator repo)
  try {
    const personal = await ghFetchAllPages<RepoRef>(
      'https://api.github.com/user/repos?affiliation=owner',
      token
    )
    personal.forEach((r) => addRepo(r.owner?.login, r.name))
  } catch (err) {
    console.warn('[notifier] Failed to fetch personal repos:', err)
  }

  // All orgs the user belongs to
  let orgs: OrgRef[] = []
  try {
    orgs = await ghFetchAllPages<OrgRef>('https://api.github.com/user/orgs', token)
  } catch (err) {
    console.warn('[notifier] Failed to fetch orgs:', err)
  }

  for (const org of orgs) {
    try {
      const orgRepos = await ghFetchAllPages<RepoRef>(
        `https://api.github.com/orgs/${org.login}/repos`,
        token
      )
      orgRepos.forEach((r) => addRepo(r.owner?.login ?? org.login, r.name))
    } catch (err) {
      console.warn(`[notifier] Failed to fetch repos for org ${org.login}:`, err)
    }
  }

  return result
}

/**
 * Fetch active runs across all monitored repos. Returns a flat list with `_owner` and `_repo`
 * attached so callers know which repo each run belongs to.
 */
export async function fetchActiveRunsForRepos(
  token: string,
  repos: ReadonlyArray<{ owner: string; repo: string }>
): Promise<WorkflowRun[]> {
  const all = await Promise.all(
    repos.map(async ({ owner, repo }) => {
      try {
        const data = await ghFetch<{ workflow_runs: GitHubRunResponse[] }>(
          `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=30`,
          token
        )
        return (data.workflow_runs || [])
          .filter((r) => ACTIVE_STATUSES.has(r.status))
          .map((r) => ({ ...r, _owner: owner, _repo: repo } as WorkflowRun))
      } catch (err) {
        console.warn(`[notifier] Failed to fetch runs for ${owner}/${repo}:`, err)
        return []
      }
    })
  )
  return all.flat()
}

export async function fetchJobsForRun(
  token: string,
  owner: string,
  repo: string,
  runId: number
): Promise<WorkflowJob[]> {
  try {
    const data = await ghFetch<{ jobs: WorkflowJob[] }>(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
      token
    )
    return data.jobs || []
  } catch (err) {
    console.warn(`[notifier] Failed to fetch jobs for ${owner}/${repo}#${runId}:`, err)
    return []
  }
}

/**
 * Try to extract ENVIRONMENT/SUBSCRIPTION inputs for a run. Returns:
 * - { hasSetEnv: false, ... } when the run doesn't use the deap_set_env reusable workflow.
 * - { hasSetEnv: true, ready: false } when set-env exists but isn't completed yet (caller should wait).
 * - { hasSetEnv: true, ready: true, inputs } when we successfully parsed.
 */
export async function tryGetInputsForRun(
  token: string,
  run: WorkflowRun,
  keys: readonly string[]
): Promise<{
  hasSetEnv: boolean
  ready: boolean
  inputs?: Record<string, string | undefined>
}> {
  const jobs = await fetchJobsForRun(token, run._owner, run._repo, run.id)
  const setEnv = findSetEnvJob(jobs)
  if (!setEnv) return { hasSetEnv: false, ready: false }
  if (setEnv.status !== 'completed') return { hasSetEnv: true, ready: false }

  const url = `https://api.github.com/repos/${run._owner}/${run._repo}/actions/jobs/${setEnv.id}/logs`
  const text = await ghFetchText(url, token)
  if (!text) return { hasSetEnv: true, ready: false }

  const inputs = parseInputs(text, keys)
  return { hasSetEnv: true, ready: true, inputs }
}
