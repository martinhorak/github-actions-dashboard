import { useState } from 'react'

interface TokenFormProps {
  onLogin: (token: string, remember: boolean) => void
  error?: string
}

export function TokenForm({ onLogin, error }: TokenFormProps) {
  const [value, setValue] = useState('')
  const [remember, setRemember] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onLogin(trimmed, remember)
  }

  return (
    <>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px', fontSize: '14px' }}>
        Enter your GitHub Personal Access Token with{' '}
        <strong>actions:read</strong>, <strong>repo</strong>, and{' '}
        <strong>read:org</strong> permissions.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ghp_... or github_pat_..."
          autoComplete="off"
          spellCheck={false}
          className="token-input"
        />
        <label className="remember-me">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span className="toggle-track" />
          Remember token (stored in browser)
        </label>
        {error && <div className="error-msg">{error}</div>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button type="submit" className="btn btn-primary">
            Connect
          </button>
        </div>
      </form>
    </>
  )
}
