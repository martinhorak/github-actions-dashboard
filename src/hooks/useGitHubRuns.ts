import { useQuery } from '@tanstack/react-query'
import { getUser, getOrgs, getRepos, fetchAllRuns, fetchJobsForRuns } from '../api/github'
import type { RepoSource } from '../api/github'
import type { GitHubRepo, WorkflowRun } from '../types'

/**
 * Fetch authenticated user info (for personal repos).
 */
export function useUser(token: string) {
  return useQuery({
    queryKey: ['github-user'],
    queryFn: () => getUser(token),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: !!token,
  })
}

/**
 * Orgs are cached for 10 minutes — they rarely change.
 */
export function useOrgs(token: string) {
  return useQuery({
    queryKey: ['github-orgs'],
    queryFn: () => getOrgs(token),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: !!token,
  })
}

/**
 * Repos are cached for 5 minutes — they rarely change.
 * Fetches repos for all selected sources (orgs + user).
 */
export function useRepos(token: string, sources: RepoSource[]) {
  return useQuery({
    queryKey: ['github-repos', sources.map((s) => `${s.type}:${s.login}`).sort().join(',')],
    queryFn: () => getRepos(token, sources),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    enabled: !!token && sources.length > 0,
  })
}

/**
 * Runs are fetched every 30 seconds.
 * Only fetches for enabled repos (filtered by disabledRepos set).
 * 1 API call per repo per cycle.
 */
export function useGitHubRuns(token: string, enabledRepos: GitHubRepo[]) {
  return useQuery({
    queryKey: ['github-runs', enabledRepos.map((r) => `${r.owner?.login}/${r.name}`).join(',')],
    queryFn: () => fetchAllRuns(enabledRepos, token),
    refetchInterval: 30_000,
    staleTime: 15_000,
    enabled: !!token && enabledRepos.length > 0,
  })
}

/**
 * Jobs are fetched separately with a longer staleTime.
 * Only runs when there are active runs. Refetches every 30s.
 */
export function useJobsForRuns(token: string, runs: WorkflowRun[]) {
  return useQuery({
    queryKey: ['github-jobs', runs.map((r) => r.id).join(',')],
    queryFn: () => fetchJobsForRuns(runs, token),
    staleTime: 20_000,
    refetchInterval: 30_000,
    enabled: !!token && runs.length > 0,
  })
}
