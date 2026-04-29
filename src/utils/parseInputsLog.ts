/**
 * Parse the `Inputs` group from a GitHub Actions job log.
 *
 * GitHub's "Set up job" step logs reusable-workflow inputs in this shape:
 *
 *   2024-01-15T12:00:00.0000000Z ##[group]Inputs
 *   2024-01-15T12:00:00.0000001Z   ENVIRONMENT: production
 *   2024-01-15T12:00:00.0000002Z   SUBSCRIPTION: ENC
 *   2024-01-15T12:00:00.0000003Z ##[endgroup]
 *
 * Returns a map of the requested keys to their values. Missing or empty values are `undefined`.
 */
export function parseInputs(
  logText: string,
  keys: readonly string[]
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const k of keys) result[k] = undefined

  const lines = logText.split(/\r?\n/)
  // GitHub emits `##[group] Inputs` (with leading space) for reusable workflow inputs,
  // but most other groups use `##[group]Foo` (no space). Match both.
  const startIdx = lines.findIndex((line) => /##\[group\]\s*Inputs\b/.test(line))
  if (startIdx === -1) return result

  const lineRegex = /^[^\s]+\s+([A-Z_][A-Z0-9_]*):\s?(.*)$/
  const wantedKeys = new Set(keys)

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('##[endgroup]')) break

    const m = line.match(lineRegex)
    if (!m) continue

    const [, key, rawValue] = m
    if (!wantedKeys.has(key)) continue

    const value = rawValue.trim()
    result[key] = value === '' ? undefined : value
  }

  return result
}
