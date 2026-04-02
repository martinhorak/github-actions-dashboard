import type { GitHubOrg, GitHubRepo, WorkflowRun, WorkflowJob, RunsData } from '../types'

const ACTIVE_STATUSES = new Set(['in_progress', 'queued', 'waiting', 'requested', 'pending'])

// Concurrency limiter
function createPool(concurrency: number) {
  let active = 0
  const queue: Array<{
    fn: () => Promise<unknown>
    resolve: (value: unknown) => void
    reject: (reason: unknown) => void
  }> = []

  function next() {
    if (queue.length === 0 || active >= concurrency) return
    active++
    const { fn, resolve, reject } = queue.shift()!
    fn()
      .then(resolve, reject)
      .finally(() => {
        active--
        next()
      })
  }

  return function run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push({ fn: fn as () => Promise<unknown>, resolve: resolve as (value: unknown) => void, reject })
      next()
    })
  }
}

const apiPool = createPool(6)

async function ghFetch<T>(url: string, token: string): Promise<T> {
  return apiPool(async () => {
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(`HTTP ${resp.status}: Insufficient token permissions`)
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return resp.json() as Promise<T>
  })
}

async function fetchAllPages<T>(baseUrl: string, token: string): Promise<T[]> {
  let page = 1
  let all: T[] = []
  while (true) {
    const sep = baseUrl.includes('?') ? '&' : '?'
    const data = await ghFetch<T[]>(`${baseUrl}${sep}per_page=100&page=${page}`, token)
    const items = Array.isArray(data) ? data : []
    all = all.concat(items)
    if (items.length < 100) break
    page++
  }
  return all
}

export async function getUser(token: string): Promise<GitHubOrg> {
  const user = await ghFetch<{ login: string; avatar_url: string }>(
    'https://api.github.com/user',
    token
  )
  return { login: user.login, avatar_url: user.avatar_url, type: 'User' }
}

export async function getOrgs(token: string): Promise<GitHubOrg[]> {
  const orgs = await fetchAllPages<GitHubOrg>('https://api.github.com/user/orgs', token)
  return orgs.map((o) => ({ ...o, type: 'Organization' as const }))
}

export interface RepoSource {
  login: string
  type: 'Organization' | 'User'
}

export async function getRepos(token: string, sources: RepoSource[]): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = []
  for (const source of sources) {
    // /user/repos returns all repos (including private) for the authenticated user
    // /users/{login}/repos only returns public repos
    const endpoint = source.type === 'User'
      ? 'https://api.github.com/user/repos?affiliation=owner'
      : `https://api.github.com/orgs/${source.login}/repos`
    const repos = await fetchAllPages<GitHubRepo>(endpoint, token)
    // Ensure owner field is set
    repos.forEach((r) => {
      if (!r.owner) r.owner = { login: source.login }
    })
    allRepos.push(...repos)
  }
  return allRepos
}

export async function fetchAllRuns(repos: GitHubRepo[], token: string): Promise<RunsData> {
  const runPromises = repos.map(async (repo) => {
    try {
      const owner = repo.owner?.login ?? 'unknown'
      const data = await ghFetch<{ workflow_runs: WorkflowRun[] }>(
        `https://api.github.com/repos/${owner}/${repo.name}/actions/runs?per_page=30`,
        token
      )
      const activeRuns = (data.workflow_runs || []).filter((r) =>
        ACTIVE_STATUSES.has(r.status)
      )
      activeRuns.forEach((r) => {
        r._repo = repo
      })
      return activeRuns
    } catch {
      return []
    }
  })

  const results = await Promise.all(runPromises)
  const allRuns = results.flat()

  // Sort: in_progress first, then by created_at desc
  allRuns.sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
    if (a.status !== 'in_progress' && b.status === 'in_progress') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return { runs: allRuns }
}

export async function fetchJobsForRuns(
  runs: WorkflowRun[],
  token: string
): Promise<Map<number, WorkflowJob[]>> {
  const jobsMap = new Map<number, WorkflowJob[]>()

  const promises = runs.slice(0, 20).map(async (run) => {
    try {
      const data = await ghFetch<{ jobs: WorkflowJob[] }>(run.jobs_url, token)
      jobsMap.set(run.id, data.jobs || [])
    } catch {
      jobsMap.set(run.id, [])
    }
  })

  await Promise.all(promises)
  return jobsMap
}
