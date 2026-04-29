import express from 'express'
import { loadFromFile, getConfig, saveConfig } from './notifierConfig.js'
import { parseMonitoredRepos, startNotifier } from './notifier.js'
import { fetchAllAccessibleRepos } from './githubPoll.js'
import { buildTestMessage, sendTeamsMessage } from './teams.js'

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3002

// Notifier config (env-driven; never user-supplied)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const MONITORED_REPOS_RAW = process.env.MONITORED_REPOS || ''
const DASHBOARD_URL = process.env.DASHBOARD_URL || ''

// OAuth App credentials
const OAUTH_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ''
const OAUTH_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || ''

// GitHub App credentials
const APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID || ''
const APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET || ''

// AUTH_METHOD: 'oauth' (default) or 'github-app'
const AUTH_METHOD = process.env.AUTH_METHOD || 'oauth'

// Resolve active credentials based on AUTH_METHOD
const activeClientId = AUTH_METHOD === 'github-app' ? APP_CLIENT_ID : OAUTH_CLIENT_ID
const activeClientSecret = AUTH_METHOD === 'github-app' ? APP_CLIENT_SECRET : OAUTH_CLIENT_SECRET

// Rate limiting: simple in-memory per-IP limiter for callback endpoint
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 10

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)
  if (recent.length >= RATE_LIMIT_MAX) return false
  recent.push(now)
  rateLimitMap.set(ip, recent)
  return true
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Return auth config for the frontend
app.get('/api/auth/config', (_req, res) => {
  if (!activeClientId) {
    res.json({ method: AUTH_METHOD, clientId: null, configured: false })
  } else {
    res.json({ method: AUTH_METHOD, clientId: activeClientId, configured: true })
  }
})

// Exchange authorization code for access token (works for both OAuth App and GitHub App)
app.post('/api/auth/callback', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  if (!rateLimit(ip)) {
    res.status(429).json({ error: 'Too many requests. Try again later.' })
    return
  }

  const { code } = req.body
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' })
    return
  }

  if (!activeClientId || !activeClientSecret) {
    res.status(500).json({ error: 'GitHub authentication is not configured on this server' })
    return
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: activeClientId,
        client_secret: activeClientSecret,
        code,
      }),
    })

    const data = await response.json() as Record<string, unknown>

    if (data.error) {
      console.error('GitHub auth error:', data.error)
      res.status(400).json({ error: data.error_description || data.error })
      return
    }

    console.log(`${AUTH_METHOD} token exchange successful`)
    res.json({
      access_token: data.access_token,
      token_type: data.token_type,
      scope: data.scope,
    })
  } catch (err) {
    console.error('Token exchange failed:', err)
    res.status(500).json({ error: 'Failed to exchange authorization code' })
  }
})

// ────────── Notifier endpoints ──────────

app.get('/api/notifier/config', (_req, res) => {
  res.json(getConfig())
})

app.post('/api/notifier/config', async (req, res) => {
  const body = req.body as { webhookUrl?: unknown; enabled?: unknown }
  const webhookUrl =
    typeof body.webhookUrl === 'string'
      ? body.webhookUrl.trim()
      : body.webhookUrl == null
        ? null
        : undefined
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : undefined

  if (webhookUrl === undefined || enabled === undefined) {
    res.status(400).json({ error: 'Body must contain { webhookUrl: string|null, enabled: boolean }' })
    return
  }
  if (webhookUrl && !/^https:\/\//i.test(webhookUrl)) {
    res.status(400).json({ error: 'webhookUrl must start with https://' })
    return
  }

  try {
    const next = await saveConfig({ webhookUrl: webhookUrl || null, enabled })
    res.json(next)
  } catch (err) {
    console.error('[notifier] Failed to save config:', err)
    res.status(500).json({ error: 'Failed to persist config' })
  }
})

app.post('/api/notifier/test', async (_req, res) => {
  const config = getConfig()
  if (!config.webhookUrl) {
    res.status(400).json({ error: 'No webhook URL configured. Save one first.' })
    return
  }
  const payload = buildTestMessage(DASHBOARD_URL || 'https://example.invalid')
  try {
    await sendTeamsMessage(config.webhookUrl, payload)
    res.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[notifier] Test send failed:', message)
    res.status(502).json({ error: `Teams webhook rejected: ${message}` })
  }
})

// ────────── Server start ──────────

app.listen(PORT, async () => {
  console.log(`ghactions-api listening on port ${PORT}`)
  console.log(`Auth method: ${AUTH_METHOD}`)
  console.log(`Configured: ${!!activeClientId && !!activeClientSecret}`)

  // Load notifier persisted config (webhook URL + enabled flag)
  await loadFromFile()

  // Start background notifier loop if env config is present
  const monitoredRepos = parseMonitoredRepos(MONITORED_REPOS_RAW)
  if (!GITHUB_TOKEN) {
    console.log('[notifier] Disabled — set GITHUB_TOKEN to enable')
  } else if (!DASHBOARD_URL) {
    console.log('[notifier] Disabled — set DASHBOARD_URL to enable (so notifications can link back)')
  } else if (monitoredRepos.length === 0) {
    console.log('[notifier] MONITORED_REPOS is empty — auto-discovering all repos accessible to GITHUB_TOKEN')
    startNotifier(
      GITHUB_TOKEN,
      {
        resolve: () => fetchAllAccessibleRepos(GITHUB_TOKEN),
        label: 'all repos accessible to token',
      },
      DASHBOARD_URL
    )
  } else {
    startNotifier(GITHUB_TOKEN, monitoredRepos, DASHBOARD_URL)
  }
})
