import type { WorkflowJob } from '../types'
import { formatDuration } from '../utils/formatDuration'
import { useTimer } from '../hooks/useTimer'

interface JobItemProps {
  job: WorkflowJob
}

function JobIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress') {
    return (
      <svg className="job-status-icon" viewBox="0 0 16 16" fill="var(--color-in-progress)">
        <circle cx="8" cy="8" r="7" fill="none" stroke="var(--color-in-progress)" strokeWidth="2" strokeDasharray="16 28" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" values="0 8 8;360 8 8" dur="1s" repeatCount="indefinite" />
        </circle>
      </svg>
    )
  }
  if (status === 'queued' || status === 'waiting') {
    return (
      <svg className="job-status-icon" viewBox="0 0 16 16" fill="var(--color-queued)">
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    )
  }
  if (conclusion === 'success') {
    return (
      <svg className="job-status-icon" viewBox="0 0 16 16" fill="var(--color-success)">
        <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z" />
      </svg>
    )
  }
  if (conclusion === 'failure') {
    return (
      <svg className="job-status-icon" viewBox="0 0 16 16" fill="#f85149">
        <path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z" />
      </svg>
    )
  }
  return (
    <svg className="job-status-icon" viewBox="0 0 16 16" fill="var(--color-queued)">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function JobItem({ job }: JobItemProps) {
  useTimer(1000)

  return (
    <div className="job-item">
      <JobIcon status={job.status} conclusion={job.conclusion} />
      <a
        href={job.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="job-name"
        style={{ color: 'var(--color-link)', textDecoration: 'none' }}
      >
        {job.name}
      </a>
      <span className="job-duration">
        {job.started_at ? formatDuration(job.started_at) : '--'}
      </span>
    </div>
  )
}
