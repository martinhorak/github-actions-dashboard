import express from 'express'

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3002

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

app.listen(PORT, () => {
  console.log(`ghactions-api listening on port ${PORT}`)
  console.log(`Auth method: ${AUTH_METHOD}`)
  console.log(`Configured: ${!!activeClientId && !!activeClientSecret}`)
})
