interface StatusBadgeProps {
  status: string
  conclusion?: string | null
}

export function StatusBadge({ status, conclusion }: StatusBadgeProps) {
  if (status === 'completed') {
    if (conclusion === 'success') {
      return (
        <span className="status-badge success">
          <svg className="status-icon-svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z" />
          </svg>
          Finished
        </span>
      )
    }
    return (
      <span className="status-badge failure">
        <svg className="status-icon-svg" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z" />
        </svg>
        Failed
      </span>
    )
  }

  const statusClass =
    status === 'in_progress'
      ? 'in_progress'
      : status === 'queued'
        ? 'queued'
        : 'waiting'

  const statusLabel =
    status === 'in_progress'
      ? 'In progress'
      : status === 'queued'
        ? 'Queued'
        : status

  const iconClass =
    status === 'queued' ? 'status-icon queued' : 'status-icon'

  return (
    <span className={`status-badge ${statusClass}`}>
      <span className={iconClass}></span>
      {statusLabel}
    </span>
  )
}
