import { useState, useRef, useEffect, useMemo } from 'react'
import type { GitHubOrg, GitHubRepo } from '../types'

interface RepoCounterProps {
  repos: GitHubRepo[]
  orgs: GitHubOrg[]
  disabledRepos: Set<string>
  onToggleRepo: (qualifiedName: string) => void
  multiOrg: boolean
}

function qualifiedName(repo: GitHubRepo): string {
  return `${repo.owner?.login}/${repo.name}`
}

export function RepoCounter({ repos, orgs, disabledRepos, onToggleRepo, multiOrg }: RepoCounterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const enabledCount = repos.filter((r) => !disabledRepos.has(qualifiedName(r))).length

  // Group repos by owner
  const grouped = useMemo(() => {
    const map: Record<string, GitHubRepo[]> = {}
    repos.forEach((r) => {
      const owner = r.owner?.login ?? 'unknown'
      if (!map[owner]) map[owner] = []
      map[owner].push(r)
    })
    // Sort repos within each group
    Object.values(map).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)))
    return map
  }, [repos])

  const orgMap = useMemo(() => {
    const m: Record<string, GitHubOrg> = {}
    orgs.forEach((o) => { m[o.login] = o })
    return m
  }, [orgs])

  // Close popover on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggleAll = () => {
    if (enabledCount === repos.length) {
      repos.forEach((r) => {
        const qn = qualifiedName(r)
        if (!disabledRepos.has(qn)) onToggleRepo(qn)
      })
    } else {
      repos.forEach((r) => {
        const qn = qualifiedName(r)
        if (disabledRepos.has(qn)) onToggleRepo(qn)
      })
    }
  }

  const toggleGroup = (ownerRepos: GitHubRepo[]) => {
    const groupEnabled = ownerRepos.filter((r) => !disabledRepos.has(qualifiedName(r))).length
    if (groupEnabled === ownerRepos.length) {
      // Disable all in group
      ownerRepos.forEach((r) => {
        const qn = qualifiedName(r)
        if (!disabledRepos.has(qn)) onToggleRepo(qn)
      })
    } else {
      // Enable all in group
      ownerRepos.forEach((r) => {
        const qn = qualifiedName(r)
        if (disabledRepos.has(qn)) onToggleRepo(qn)
      })
    }
  }

  const sortedOwners = Object.keys(grouped).sort()

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="repo-counter-btn"
        onClick={() => setOpen((prev) => !prev)}
        title="Show repository list"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
        </svg>
        {enabledCount}/{repos.length} repos
      </button>

      {open && (
        <div className="repo-popover">
          <div className="repo-popover-header">
            <span>Repositories ({enabledCount} of {repos.length})</span>
            <label
              className="repo-toggle"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                className="repo-switch"
                checked={enabledCount === repos.length}
                ref={(el) => {
                  if (el) el.indeterminate = enabledCount > 0 && enabledCount < repos.length
                }}
                onChange={toggleAll}
              />
              <span className="repo-switch-track">
                <span className="repo-switch-thumb" />
              </span>
            </label>
          </div>
          <div className="repo-popover-list">
            {multiOrg ? (
              // Grouped by org
              sortedOwners.map((owner) => {
                const ownerRepos = grouped[owner]
                const org = orgMap[owner]
                const groupEnabled = ownerRepos.filter((r) => !disabledRepos.has(qualifiedName(r))).length
                return (
                  <div key={owner}>
                    <div
                      className="repo-popover-group-header"
                      onClick={() => toggleGroup(ownerRepos)}
                    >
                      {org?.avatar_url ? (
                        <img src={org.avatar_url} alt={owner} className="org-avatar" />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                          <path d="M1.75 16A1.75 1.75 0 0 1 0 14.25V1.75C0 .784.784 0 1.75 0h8.5C11.216 0 12 .784 12 1.75v12.5c0 .085-.006.168-.018.25h2.268a.25.25 0 0 0 .25-.25V8.285a.25.25 0 0 0-.111-.208l-1.055-.703a.749.749 0 1 1 .832-1.248l1.055.703c.487.325.777.871.777 1.456v5.965A1.75 1.75 0 0 1 14.25 16h-3.5a.766.766 0 0 1-.197-.026c-.099.017-.2.026-.303.026h-3a.75.75 0 0 1-.75-.75V14h-1v1.25a.75.75 0 0 1-.75.75Zm-.25-1.75c0 .138.112.25.25.25H4v-1.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.25h2.25a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Z" />
                        </svg>
                      )}
                      <span className="repo-popover-group-name">{owner}</span>
                      <span className="repo-popover-group-count">{groupEnabled}/{ownerRepos.length}</span>
                      <label
                        className="repo-toggle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="repo-switch"
                          checked={groupEnabled === ownerRepos.length}
                          ref={(el) => {
                            if (el) el.indeterminate = groupEnabled > 0 && groupEnabled < ownerRepos.length
                          }}
                          onChange={() => toggleGroup(ownerRepos)}
                        />
                        <span className="repo-switch-track">
                          <span className="repo-switch-thumb" />
                        </span>
                      </label>
                    </div>
                    {ownerRepos.map((repo) => {
                      const qn = qualifiedName(repo)
                      const enabled = !disabledRepos.has(qn)
                      return (
                        <div
                          key={qn}
                          className="repo-popover-row repo-popover-row--indented"
                          onClick={() => onToggleRepo(qn)}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, opacity: enabled ? 1 : 0.4 }}>
                            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                          </svg>
                          <span className="repo-popover-name">
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`repo-popover-link ${enabled ? '' : 'repo-popover-link--off'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {repo.name}
                            </a>
                          </span>
                          <label
                            className="repo-toggle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="repo-switch"
                              checked={enabled}
                              onChange={() => onToggleRepo(qn)}
                            />
                            <span className="repo-switch-track">
                              <span className="repo-switch-thumb" />
                            </span>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            ) : (
              // Flat list (single org)
              [...repos]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((repo) => {
                  const qn = qualifiedName(repo)
                  const enabled = !disabledRepos.has(qn)
                  return (
                    <div
                      key={qn}
                      className="repo-popover-row"
                      onClick={() => onToggleRepo(qn)}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, opacity: enabled ? 1 : 0.4 }}>
                        <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                      </svg>
                      <span className="repo-popover-name">
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`repo-popover-link ${enabled ? '' : 'repo-popover-link--off'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {repo.name}
                        </a>
                      </span>
                      <label
                        className="repo-toggle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="repo-switch"
                          checked={enabled}
                          onChange={() => onToggleRepo(qn)}
                        />
                        <span className="repo-switch-track">
                          <span className="repo-switch-thumb" />
                        </span>
                      </label>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
