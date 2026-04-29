export interface NotifierConfig {
  webhookUrl: string | null
  enabled: boolean
}

async function asJson<T>(resp: Response): Promise<T> {
  const text = await resp.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* fall through */
  }
  if (!resp.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) || `HTTP ${resp.status}`
    throw new Error(message)
  }
  return data as T
}

export async function getNotifierConfig(): Promise<NotifierConfig> {
  const resp = await fetch('/api/notifier/config', { credentials: 'same-origin' })
  return asJson<NotifierConfig>(resp)
}

export async function saveNotifierConfig(config: NotifierConfig): Promise<NotifierConfig> {
  const resp = await fetch('/api/notifier/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return asJson<NotifierConfig>(resp)
}

export async function testNotifierWebhook(): Promise<void> {
  const resp = await fetch('/api/notifier/test', { method: 'POST' })
  await asJson<{ ok: true }>(resp)
}
