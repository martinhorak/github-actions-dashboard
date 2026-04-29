import { useEffect, useState } from 'react'
import {
  getNotifierConfig,
  saveNotifierConfig,
  testNotifierWebhook,
} from '../api/notifier'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string }

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<Status>({ kind: 'idle' })
  const [testStatus, setTestStatus] = useState<Status>({ kind: 'idle' })

  // Reload config every time modal opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSaveStatus({ kind: 'idle' })
    setTestStatus({ kind: 'idle' })
    getNotifierConfig()
      .then((cfg) => {
        if (cancelled) return
        setWebhookUrl(cfg.webhookUrl ?? '')
        setEnabled(!!cfg.enabled)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  // Esc to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const trimmed = webhookUrl.trim()
  const urlValid = trimmed === '' || /^https:\/\//i.test(trimmed)

  const handleSave = async () => {
    if (!urlValid) {
      setSaveStatus({ kind: 'error', message: 'Webhook URL must start with https://' })
      return
    }
    setSaveStatus({ kind: 'busy' })
    try {
      await saveNotifierConfig({ webhookUrl: trimmed || null, enabled })
      setSaveStatus({ kind: 'ok', message: 'Saved' })
    } catch (err: unknown) {
      setSaveStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const handleTest = async () => {
    setTestStatus({ kind: 'busy' })
    try {
      await testNotifierWebhook()
      setTestStatus({ kind: 'ok', message: 'Test message sent — check your Teams channel' })
    } catch (err: unknown) {
      setTestStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-header">
          <h2 id="settings-title">Notification settings</h2>
          <button className="modal-close" onClick={onClose} title="Close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {loading && <div className="modal-info">Loading current configuration…</div>}
          {loadError && (
            <div className="modal-error">Failed to load config: {loadError}</div>
          )}

          <p className="modal-description">
            When enabled, the server posts a notification to your Microsoft Teams channel
            each time a new workflow run is detected in a monitored repo. Configuration is
            stored on the server and applies regardless of who is logged in.
          </p>

          <label className="modal-field">
            <span className="modal-field-label">Teams webhook URL</span>
            <input
              type="url"
              className="modal-input"
              placeholder="https://prod-XX.westeurope.logic.azure.com/workflows/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={loading}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            {!urlValid && (
              <span className="modal-field-hint modal-field-hint--error">
                Must start with https://
              </span>
            )}
          </label>

          <label className="modal-field modal-field--row">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={loading}
            />
            <span>Enable notifications</span>
          </label>

          {saveStatus.kind === 'ok' && (
            <div className="modal-info modal-info--ok">{saveStatus.message}</div>
          )}
          {saveStatus.kind === 'error' && (
            <div className="modal-error">{saveStatus.message}</div>
          )}
          {testStatus.kind === 'ok' && (
            <div className="modal-info modal-info--ok">{testStatus.message}</div>
          )}
          {testStatus.kind === 'error' && (
            <div className="modal-error">Test failed: {testStatus.message}</div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn"
            onClick={handleTest}
            disabled={loading || !trimmed || testStatus.kind === 'busy'}
            title="Send a test message to the webhook URL currently saved on the server"
          >
            {testStatus.kind === 'busy' ? 'Sending…' : 'Test'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading || !urlValid || saveStatus.kind === 'busy'}
          >
            {saveStatus.kind === 'busy' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
