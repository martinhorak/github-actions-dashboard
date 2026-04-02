import { useState, useRef, useEffect } from 'react'
import type { GitHubOrg } from '../types'

interface OrgSelectorProps {
  orgs: GitHubOrg[]
  selectedOrgs: Set<string>
  onToggleOrg: (orgLogin: string) => void
}

export function OrgSelector({ orgs, selectedOrgs, onToggleOrg }: OrgSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedCount = orgs.filter((o) => selectedOrgs.has(o.login)).length

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

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="repo-counter-btn"
        onClick={() => setOpen((prev) => !prev)}
        title="Show organization list"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.75 16A1.75 1.75 0 0 1 0 14.25V1.75C0 .784.784 0 1.75 0h8.5C11.216 0 12 .784 12 1.75v12.5c0 .085-.006.168-.018.25h2.268a.25.25 0 0 0 .25-.25V8.285a.25.25 0 0 0-.111-.208l-1.055-.703a.749.749 0 1 1 .832-1.248l1.055.703c.487.325.777.871.777 1.456v5.965A1.75 1.75 0 0 1 14.25 16h-3.5a.766.766 0 0 1-.197-.026c-.099.017-.2.026-.303.026h-3a.75.75 0 0 1-.75-.75V14h-1v1.25a.75.75 0 0 1-.75.75Zm-.25-1.75c0 .138.112.25.25.25H4v-1.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.25h2.25a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25ZM3.75 6h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5ZM3 3.75A.75.75 0 0 1 3.75 3h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 3 3.75Zm4 3A.75.75 0 0 1 7.75 6h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 7 6.75ZM7.75 3h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5ZM3 9.75A.75.75 0 0 1 3.75 9h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 3 9.75ZM7.75 9h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5Z" />
        </svg>
        {selectedCount}/{orgs.length} orgs
      </button>

      {open && (
        <div className="repo-popover">
          <div className="repo-popover-header">
            <span>Organizations ({selectedCount} of {orgs.length})</span>
            <label
              className="repo-toggle"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                className="repo-switch"
                checked={selectedCount === orgs.length}
                ref={(el) => {
                  if (el) el.indeterminate = selectedCount > 0 && selectedCount < orgs.length
                }}
                onChange={() => {
                  if (selectedCount === orgs.length) {
                    orgs.forEach((o) => {
                      if (selectedOrgs.has(o.login)) onToggleOrg(o.login)
                    })
                  } else {
                    orgs.forEach((o) => {
                      if (!selectedOrgs.has(o.login)) onToggleOrg(o.login)
                    })
                  }
                }}
              />
              <span className="repo-switch-track">
                <span className="repo-switch-thumb" />
              </span>
            </label>
          </div>
          <div className="repo-popover-list">
            {[...orgs]
              .sort((a, b) => a.login.localeCompare(b.login))
              .map((org) => {
                const selected = selectedOrgs.has(org.login)
                return (
                  <div
                    key={org.login}
                    className="repo-popover-row"
                    onClick={() => onToggleOrg(org.login)}
                  >
                    <img
                      src={org.avatar_url}
                      alt={org.login}
                      className="org-avatar"
                      style={{ opacity: selected ? 1 : 0.4 }}
                    />
                    <span className="repo-popover-name">
                      <a
                        href={`https://github.com/${org.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`repo-popover-link ${selected ? '' : 'repo-popover-link--off'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {org.login}
                      </a>
                    </span>
                    <label
                      className="repo-toggle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="repo-switch"
                        checked={selected}
                        onChange={() => onToggleOrg(org.login)}
                      />
                      <span className="repo-switch-track">
                        <span className="repo-switch-thumb" />
                      </span>
                    </label>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
