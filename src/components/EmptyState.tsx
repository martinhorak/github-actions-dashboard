export function EmptyState() {
  return (
    <div className="empty-state">
      <svg width="48" height="48" viewBox="0 0 16 16" fill="var(--color-text-muted)">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm9.78-2.22-5.5 5.5a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l5.5-5.5a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z" />
      </svg>
      <h3>No running Actions</h3>
      <p>There are no GitHub Actions currently running in selected repositories.</p>
    </div>
  )
}
