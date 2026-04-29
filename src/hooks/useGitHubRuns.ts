import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { getUser, getOrgs, getRepos, fetchAllRuns, fetchJobsForRuns } from '../api/github'
import { fetchJobInputs } from '../api/githubLogs'
import type { RepoSource } from '../api/github'
import type { GitHubRepo, WorkflowJob, WorkflowRun } from '../types'
import { findSetEnvJob } from '../utils/findSetEnvJob'

const INPUT_KEYS = ['ENVIRONMENT', 'SUBSCRIPTION'] as const
type InputValues = { ENVIRONMENT?: string; SUBSCRIPTION?: string }

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

/**
 * Fetch ENVIRONMENT and SUBSCRIPTION inputs for each run by parsing the
 * `set-env` job's "Set up job" log. Inputs are immutable per run.id, so
 * each query has staleTime: Infinity and never refetches once successful.
 *
 * Capped at top-20 runs (matches `fetchJobsForRuns`) for rate-limit safety.
 */
export function useInputsForRuns(
  token: string,
  runs: WorkflowRun[],
  jobsMap: Map<number, WorkflowJob[]> | undefined
): Map<number, InputValues> {
  const visibleRuns = runs.slice(0, 20)

  const queries = useQueries({
    queries: visibleRuns.map((run) => {
      const jobs = jobsMap?.get(run.id) ?? run._jobs
      const setEnv = findSetEnvJob(jobs)
      const owner = run._repo?.owner?.login ?? ''
      const repoName = run._repo?.name ?? run.repository?.name ?? ''
      const enabled =
        !!token && !!setEnv && setEnv.status === 'completed' && !!owner && !!repoName

      return {
        queryKey: ['github-run-inputs', run.id],
        queryFn: () =>
          fetchJobInputs(owner, repoName, setEnv!.id, token, INPUT_KEYS),
        enabled,
        staleTime: Infinity,
        refetchInterval: false as const,
        refetchOnWindowFocus: false,
        retry: 1,
      }
    }),
  })

  return useMemo(() => {
    const map = new Map<number, InputValues>()
    visibleRuns.forEach((run, i) => {
      const data = queries[i]?.data
      if (data && (data.ENVIRONMENT || data.SUBSCRIPTION)) {
        map.set(run.id, {
          ENVIRONMENT: data.ENVIRONMENT,
          SUBSCRIPTION: data.SUBSCRIPTION,
        })
      }
    })
    return map
    // queries identity changes when any underlying query state changes — that's exactly when we want to recompute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map((q) => q.dataUpdatedAt).join(','), visibleRuns.map((r) => r.id).join(',')])
}
