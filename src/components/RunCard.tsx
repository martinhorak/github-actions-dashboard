import { useState } from 'react'
import type { WorkflowRun } from '../types'
import { formatDuration } from '../utils/formatDuration'
import { eventLabel } from '../utils/eventLabel'
import { useTimer } from '../hooks/useTimer'
import { StatusBadge } from './StatusBadge'
import { JobItem } from './JobItem'

interface RunCardProps {
  run: WorkflowRun
}

export function RunCard({ run }: RunCardProps) {
  useTimer(1000)
  const [expanded, setExpanded] = useState(true)

  const startTime = run.run_started_at || run.created_at
  const commitMsg = run.head_commit?.message
  const actor = run.triggering_actor || run.actor
  const hasJobs = run._jobs && run._jobs.length > 0

  const toggle = () => hasJobs && setExpanded((prev) => !prev)

  return (
    <div
      className="run-card"
      onClick={toggle}
      style={{ cursor: hasJobs ? 'pointer' : 'default' }}
    >
      <div className="run-card-header">
        <div className="run-card-title">
          {hasJobs && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="var(--color-text-muted)"
              style={{
                transition: 'transform 0.15s',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                flexShrink: 0,
              }}
            >
              <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          )}
          <StatusBadge status={run.status} />
          <a
            href={run.html_url}
            target="_blank"
            rel="noopener noreferrer"
            title={run.display_title || run.name}
            onClick={(e) => e.stopPropagation()}
          >
            {run.display_title || run.name}
          </a>
        </div>
        <div className="run-card-actions">
          <span className="timer">{formatDuration(startTime)}</span>
          <a
            href={run.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="view-link"
            onClick={(e) => e.stopPropagation()}
          >
            Detail
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
            </svg>
          </a>
        </div>
      </div>

      <div className="run-meta">
        <span className="run-meta-item">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
          </svg>
          {run.name}
        </span>

        <span className="run-meta-item">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.75 2.5a.75.75 0 0 1 .75.75v.792c0 .107-.07.207-.169.244C10.474 4.897 8.999 6.62 8.5 8c-.499-1.38-1.974-3.103-3.831-3.714A.26.26 0 0 1 4.5 4.042V3.25a.75.75 0 0 1 .75-.75ZM4.5 5.834c1.562.766 2.767 2.244 3.271 3.593.167.449.76.449.927 0 .504-1.349 1.709-2.827 3.271-3.593.016-.008.031-.02.031-.037V3.25a.25.25 0 0 0-.25-.25h-7a.25.25 0 0 0-.25.25v2.547c0 .017.015.03.031.037ZM2.75 1h10.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V2.75C1 1.784 1.784 1 2.75 1Z" />
          </svg>
          <span className="branch-label">{run.head_branch}</span>
        </span>

        <span className="run-meta-item">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.53 4.75A.75.75 0 0 1 5.28 4h6.01a.75.75 0 0 1 .75.75v6.01a.75.75 0 0 1-1.5 0v-4.2l-5.26 5.261a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L9.48 5.5H5.28a.75.75 0 0 1-.75-.75Z" />
          </svg>
          {eventLabel(run.event)}
        </span>

        {actor && (
          <span className="run-meta-item">
            <img
              src={actor.avatar_url}
              width="16"
              height="16"
              style={{ borderRadius: '50%' }}
              alt={actor.login}
            />
            {actor.login}
          </span>
        )}

        <span className="run-meta-item">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          #{run.run_number}
        </span>

        {commitMsg && (
          <span
            className="run-meta-item"
            style={{
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={commitMsg}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
            </svg>
            {commitMsg.split('\n')[0].substring(0, 50)}
            {commitMsg.length > 50 ? '...' : ''}
          </span>
        )}
      </div>

      {expanded && hasJobs && (
        <div className="jobs-list">
          {run._jobs!.map((job) => (
            <JobItem key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
