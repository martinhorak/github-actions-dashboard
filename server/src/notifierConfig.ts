import { promises as fs } from 'fs'
import path from 'path'

export interface NotifierConfig {
  webhookUrl: string | null
  enabled: boolean
}

const DEFAULT_CONFIG: NotifierConfig = { webhookUrl: null, enabled: false }
const CONFIG_PATH = process.env.NOTIFIER_CONFIG_PATH
  ? path.resolve(process.env.NOTIFIER_CONFIG_PATH)
  : path.resolve(process.cwd(), 'notifier-config.json')

let currentConfig: NotifierConfig = { ...DEFAULT_CONFIG }

export async function loadFromFile(): Promise<NotifierConfig> {
  try {
    const text = await fs.readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(text) as Partial<NotifierConfig>
    currentConfig = {
      webhookUrl: typeof parsed.webhookUrl === 'string' ? parsed.webhookUrl : null,
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
    }
    console.log(`[notifier] Loaded config from ${CONFIG_PATH} (enabled=${currentConfig.enabled}, hasUrl=${!!currentConfig.webhookUrl})`)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`[notifier] No config file at ${CONFIG_PATH}, using defaults`)
    } else {
      console.warn(`[notifier] Failed to load config from ${CONFIG_PATH}:`, err)
    }
    currentConfig = { ...DEFAULT_CONFIG }
  }
  return currentConfig
}

export function getConfig(): NotifierConfig {
  return { ...currentConfig }
}

export async function saveConfig(next: NotifierConfig): Promise<NotifierConfig> {
  const sanitized: NotifierConfig = {
    webhookUrl: next.webhookUrl?.trim() || null,
    enabled: !!next.enabled,
  }
  const tmpPath = `${CONFIG_PATH}.tmp`
  await fs.writeFile(tmpPath, JSON.stringify(sanitized, null, 2), 'utf-8')
  await fs.rename(tmpPath, CONFIG_PATH)
  currentConfig = sanitized
  console.log(`[notifier] Config saved (enabled=${sanitized.enabled}, hasUrl=${!!sanitized.webhookUrl})`)
  return { ...currentConfig }
}
