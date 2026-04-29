import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUser, useOrgs, useRepos, useGitHubRuns, useJobsForRuns, useInputsForRuns } from '../hooks/useGitHubRuns'
import type { RepoSource } from '../api/github'
import { Header } from './Header'
import { RepoGroup } from './RepoGroup'
import { RepoCounter } from './RepoCounter'
import { OrgSelector } from './OrgSelector'
import { EmptyState } from './EmptyState'
import type { GitHubOrg, RepoGroup as RepoGroupType } from '../types'

const DISABLED_REPOS_KEY = 'gh_disabled_repos'
const SELECTED_ORGS_KEY = 'gh_selected_orgs'

function loadDisabledRepos(): Set<string> {
  try {
    const stored = localStorage.getItem(DISABLED_REPOS_KEY)
    if (stored) {
      const arr: string[] = JSON.parse(stored)
      // Migration: old bare names → prefixed with DEAPCZ/
      const migrated = arr.map((name) => (name.includes('/') ? name : `DEAPCZ/${name}`))
      return new Set(migrated)
    }
  } catch (e) {
    console.warn('[Dashboard] Failed to load disabled repos:', e)
  }
  return new Set()
}

function saveDisabledRepos(set: Set<string>) {
  try {
    localStorage.setItem(DISABLED_REPOS_KEY, JSON.stringify([...set]))
  } catch (e) {
    console.warn('[Dashboard] Failed to save disabled repos:', e)
  }
}

function loadSelectedOrgs(): string[] | null {
  try {
    const stored = localStorage.getItem(SELECTED_ORGS_KEY)
    if (stored !== null) return JSON.parse(stored)
  } catch (e) {
    console.warn('[Dashboard] Failed to load selected orgs:', e)
  }
  return null // null = never saved (first ever load) — distinct from saved empty array
}

function saveSelectedOrgs(set: Set<string>) {
  try {
    localStorage.setItem(SELECTED_ORGS_KEY, JSON.stringify([...set]))
  } catch (e) {
    console.warn('[Dashboard] Failed to save selected orgs:', e)
  }
}

interface DashboardProps {
  token: string
  onLogout: () => void
}

export function Dashboard({ token, onLogout }: DashboardProps) {
  const queryClient = useQueryClient()
  const { data: user } = useUser(token)
  const { data: apiOrgs } = useOrgs(token)
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(() => {
    const stored = loadSelectedOrgs()
    return stored ? new Set(stored) : new Set<string>()
  })
  const [orgsInitialized, setOrgsInitialized] = useState(false)
  const [disabledRepos, setDisabledRepos] = useState(loadDisabledRepos)

  // Combined list: user + orgs
  const allEntries: GitHubOrg[] = useMemo(() => {
    const entries: GitHubOrg[] = []
    if (user) {
      entries.push({ login: user.login, avatar_url: user.avatar_url, type: 'User' })
    }
    if (apiOrgs) {
      entries.push(...apiOrgs)
    }
    return entries
  }, [user, apiOrgs])

  // When entries load for the first time, reconcile stored selection with what's actually available.
  useEffect(() => {
    if (allEntries.length === 0 || orgsInitialized) return
    setOrgsInitialized(true)
    const stored = loadSelectedOrgs()
    const available = new Set(allEntries.map((e) => e.login))

    if (stored === null) {
      // Never saved — first ever load. Default: select all.
      setSelectedOrgs(available)
      saveSelectedOrgs(available)
      return
    }

    if (stored.length === 0) {
      // User explicitly deselected everything — respect that, don't reset.
      setSelectedOrgs(new Set())
      return
    }

    const valid = new Set(stored.filter((o) => available.has(o)))
    if (valid.size === 0) {
      // Saved orgs all became unavailable (user lost access / orgs removed) — fall back to all.
      setSelectedOrgs(available)
      saveSelectedOrgs(available)
    } else {
      setSelectedOrgs(valid)
    }
  }, [allEntries, orgsInitialized])

  // Build RepoSource[] from selected entries
  const repoSources: RepoSource[] = useMemo(() => {
    return allEntries
      .filter((e) => selectedOrgs.has(e.login))
      .map((e) => ({ login: e.login, type: e.type ?? 'Organization' }))
  }, [allEntries, selectedOrgs])

  const { data: repos } = useRepos(token, repoSources)

  const enabledRepos = useMemo(
    () => (repos ?? []).filter((r) => !disabledRepos.has(`${r.owner?.login}/${r.name}`)),
    [repos, disabledRepos]
  )

  const { data, isFetching, isError, error, dataUpdatedAt } = useGitHubRuns(token, enabledRepos)
  const { data: jobsMap } = useJobsForRuns(token, data?.runs ?? [])
  const inputsMap = useInputsForRuns(token, data?.runs ?? [], jobsMap)

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['github-runs'] })
    queryClient.invalidateQueries({ queryKey: ['github-jobs'] })
    queryClient.invalidateQueries({ queryKey: ['github-repos'] })
  }, [queryClient])

  const handleToggleOrg = useCallback((orgLogin: string) => {
    setSelectedOrgs((prev) => {
      const next = new Set(prev)
      if (next.has(orgLogin)) {
        next.delete(orgLogin)
      } else {
        next.add(orgLogin)
      }
      saveSelectedOrgs(next)
      return next
    })
  }, [])

  const handleToggleRepo = useCallback((qualifiedName: string) => {
    setDisabledRepos((prev) => {
      const next = new Set(prev)
      if (next.has(qualifiedName)) {
        next.delete(qualifiedName)
      } else {
        next.add(qualifiedName)
      }
      saveDisabledRepos(next)
      return next
    })
  }, [])

  const multiOrg = selectedOrgs.size > 1

  // Merge jobs and parsed inputs into runs
  const runsWithJobs = useMemo(() => {
    if (!data?.runs) return []
    return data.runs.map((run) => ({
      ...run,
      _jobs: jobsMap?.get(run.id) ?? run._jobs,
      _inputs: inputsMap.get(run.id) ?? run._inputs,
    }))
  }, [data, jobsMap, inputsMap])

  const groups = useMemo(() => {
    if (runsWithJobs.length === 0) return []

    const groupMap: Record<string, RepoGroupType> = {}
    runsWithJobs.forEach((run) => {
      const owner = run._repo?.owner?.login ?? 'unknown'
      const repoName = run._repo?.name || run.repository?.name || 'unknown'
      const key = `${owner}/${repoName}`
      if (!groupMap[key]) {
        groupMap[key] = {
          repo: run._repo || {
            name: repoName,
            html_url: `https://github.com/${owner}/${repoName}`,
            owner: { login: owner },
          },
          runs: [],
        }
      }
      groupMap[key].runs.push(run)
    })

    return Object.values(groupMap)
  }, [runsWithJobs])

  const totalRuns = runsWithJobs.length

  return (
    <>
      <Header
        isConnected={true}
        isFetching={isFetching && !data}
        isRefreshing={isFetching}
        isError={isError}
        errorMessage={error?.message}
        dataUpdatedAt={dataUpdatedAt}
        onLogout={onLogout}
        onRefresh={handleRefresh}
      />
      <div className="container">
        <div className="dashboard-header">
          <h1>
            Running Actions
            <span className="run-count">{totalRuns}</span>
          </h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <RepoCounter
              repos={repos ?? []}
              orgs={allEntries}
              disabledRepos={disabledRepos}
              onToggleRepo={handleToggleRepo}
              multiOrg={multiOrg}
            />
            <OrgSelector
              orgs={allEntries}
              selectedOrgs={selectedOrgs}
              onToggleOrg={handleToggleOrg}
            />
          </div>
        </div>

        {!data && isFetching && (
          <div className="loading-overlay">
            <span className="spinner" />
            Loading data...
          </div>
        )}

        {data && totalRuns === 0 && <EmptyState />}

        {groups.map((group) => (
          <RepoGroup
            key={`${group.repo.owner?.login}/${group.repo.name}`}
            group={group}
            multiOrg={multiOrg}
          />
        ))}
      </div>
    </>
  )
}
