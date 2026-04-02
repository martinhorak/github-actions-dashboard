interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
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
