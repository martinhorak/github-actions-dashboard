import { useTimer } from '../hooks/useTimer'

const REFRESH_INTERVAL = 30

interface HeaderProps {
  isConnected: boolean
  isFetching: boolean
  isRefreshing: boolean
  isError: boolean
  errorMessage?: string
  dataUpdatedAt: number
  onLogout: () => void
  onRefresh?: () => void
}

export function Header({
  isConnected,
  isFetching,
  isRefreshing,
  isError,
  errorMessage,
  dataUpdatedAt,
  onLogout,
  onRefresh,
}: HeaderProps) {
  useTimer(1000)

  let statusContent: React.ReactNode
  if (!isConnected) {
    statusContent = (
      <>
        <span className="status-dot" /> Disconnected
      </>
    )
  } else if (isError) {
    statusContent = (
      <>
        <span className="status-dot error" /> Error: {errorMessage || 'unknown'}
      </>
    )
  } else if (isFetching) {
    statusContent = (
      <>
        <span className="spinner" /> Loading...
      </>
    )
  } else {
    statusContent = null
  }

  // Countdown to next refresh
  let countdownContent: React.ReactNode = null
  if (isConnected && dataUpdatedAt && !isFetching) {
    const elapsed = Math.floor((Date.now() - dataUpdatedAt) / 1000)
    const remaining = Math.max(0, REFRESH_INTERVAL - elapsed)
    countdownContent = (
      <span className="last-update">
        Auto-refresh in {remaining}s
      </span>
    )
  }

  return (
    <header>
      <div className="logo">
        <svg height="28" viewBox="0 0 16 16" width="28">
          <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
        </svg>
        <span>Actions Dashboard</span>
      </div>
      <div className="status-bar">
        {statusContent && <span>{statusContent}</span>}
        {countdownContent}
        {isConnected && (
          <div className="token-actions">
            {onRefresh && (
              <button
                className="btn"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh"
                style={{ padding: '6px 10px' }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  style={{
                    animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
                  }}
                >
                  <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
                </svg>
              </button>
            )}
            <button className="btn btn-danger" onClick={onLogout} title="Log out">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm10.44 4.5-1.97-1.97a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.97-1.97H6.75a.75.75 0 0 1 0-1.5Z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
