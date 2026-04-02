import { useState, useEffect } from 'react'

interface OAuthLoginProps {
  error?: string
  onStatusChange?: (available: boolean) => void
}

type AuthState = 'loading' | 'available' | 'not-configured' | 'unavailable'
type AuthMethod = 'oauth' | 'github-app'

interface AuthConfig {
  method: AuthMethod
  clientId: string | null
  configured: boolean
}

export function OAuthLogin({ error, onStatusChange }: OAuthLoginProps) {
  const [state, setState] = useState<AuthState>('loading')
  const [config, setConfig] = useState<AuthConfig | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    fetch('/api/auth/config', { signal: controller.signal })
      .then((res) => res.json())
      .then((data: AuthConfig) => {
        setConfig(data)
        if (data.configured && data.clientId) {
          setState('available')
          onStatusChange?.(true)
        } else {
          setState('not-configured')
          onStatusChange?.(false)
        }
      })
      .catch(() => {
        setState('unavailable')
        onStatusChange?.(false)
      })
      .finally(() => clearTimeout(timeout))

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = () => {
    if (!config?.clientId) return
    const stateParam = crypto.randomUUID()
    sessionStorage.setItem('oauth_state', stateParam)

    const params = new URLSearchParams({
      client_id: config.clientId,
      state: stateParam,
    })

    // OAuth App needs scope parameter; GitHub App uses permissions from app settings
    if (config.method === 'oauth') {
      params.set('scope', 'repo')
    }

    window.location.href = `https://github.com/login/oauth/authorize?${params}`
  }

  const isGitHubApp = config?.method === 'github-app'
  const registerUrl = isGitHubApp
    ? 'https://github.com/settings/apps/new'
    : 'https://github.com/settings/applications/new'
  const registerLabel = isGitHubApp
    ? 'Register a new GitHub App'
    : 'Register a new OAuth App on GitHub'
  const typeLabel = isGitHubApp ? 'GitHub App' : 'OAuth'

  return (
    <div className="oauth-login">
      {state === 'loading' && (
        <div className="oauth-status">
          <span className="spinner" /> Checking availability...
        </div>
      )}

      {state === 'unavailable' && (
        <div className="oauth-info">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="var(--color-in-progress)">
            <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
          <div>
            <strong>Backend server not available</strong>
            <p>
              GitHub login requires the backend server to be running.
              Use the Access Token tab instead, or see the README for backend setup instructions.
            </p>
          </div>
        </div>
      )}

      {state === 'not-configured' && (
        <div className="oauth-info">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="var(--color-in-progress)">
            <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
          <div>
            <strong>{typeLabel} not configured</strong>
            <p>
              The server administrator needs to register a {isGitHubApp ? 'GitHub App' : 'GitHub OAuth App'} and configure the credentials.
            </p>
            <a
              href={registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="oauth-setup-link"
            >
              {registerLabel}
            </a>
          </div>
        </div>
      )}

      {state === 'available' && (
        <>
          <p className="oauth-description">
            {isGitHubApp
              ? 'Sign in with your GitHub account. Only read-only access to Actions metadata — no access to your code.'
              : 'Sign in with your GitHub account to view workflow runs for your organizations and repositories.'}
          </p>
          <button className="btn oauth-btn" onClick={handleLogin}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            Sign in with GitHub
          </button>
        </>
      )}

      {error && <div className="error-msg" style={{ marginTop: '12px' }}>{error}</div>}
    </div>
  )
}
