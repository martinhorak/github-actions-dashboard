import { useState, useCallback, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './components/LoginPage'
import { Dashboard } from './components/Dashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
})

function getStoredToken(): string {
  return sessionStorage.getItem('gh_actions_token') || localStorage.getItem('gh_actions_token') || ''
}

export default function App() {
  const [token, setToken] = useState(getStoredToken)
  const [loginError, setLoginError] = useState('')
  const [oauthError, setOauthError] = useState('')
  const [oauthLoading, setOauthLoading] = useState(false)

  const handleLogin = useCallback((newToken: string, remember: boolean) => {
    setToken(newToken)
    setLoginError('')
    setOauthError('')
    sessionStorage.setItem('gh_actions_token', newToken)
    if (remember) {
      localStorage.setItem('gh_actions_token', newToken)
    } else {
      localStorage.removeItem('gh_actions_token')
    }
  }, [])

  const handleLogout = useCallback(() => {
    setToken('')
    sessionStorage.removeItem('gh_actions_token')
    localStorage.removeItem('gh_actions_token')
    queryClient.clear()
  }, [])

  // Handle OAuth callback: ?code=XXX&state=XXX in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code || !state) return

    // Clean URL immediately
    window.history.replaceState({}, '', window.location.pathname)

    // Verify state
    const savedState = sessionStorage.getItem('oauth_state')
    sessionStorage.removeItem('oauth_state')

    if (state !== savedState) {
      setOauthError('OAuth state mismatch. Please try again.')
      return
    }

    // Exchange code for token
    setOauthLoading(true)
    fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data: { access_token?: string; error?: string }) => {
        if (data.access_token) {
          handleLogin(data.access_token, false)
        } else {
          setOauthError(data.error || 'Failed to authenticate with GitHub')
        }
      })
      .catch(() => {
        setOauthError('Failed to connect to the authentication server')
      })
      .finally(() => {
        setOauthLoading(false)
      })
  }, [handleLogin])

  if (oauthLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="container">
          <div className="loading-overlay">
            <span className="spinner" />
            Signing in with GitHub...
          </div>
        </div>
      </QueryClientProvider>
    )
  }

  if (!token) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="container">
          <LoginPage onLogin={handleLogin} error={loginError} oauthError={oauthError} />
        </div>
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard token={token} onLogout={handleLogout} />
    </QueryClientProvider>
  )
}
