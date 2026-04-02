export function formatDuration(startStr: string): string {
  const start = new Date(startStr)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const secs = Math.floor(diffMs / 1000)
  const mins = Math.floor(secs / 60)
  const hrs = Math.floor(mins / 60)

  if (hrs > 0) return `${hrs}h ${mins % 60}m ${secs % 60}s`
  if (mins > 0) return `${mins}m ${secs % 60}s`
  return `${secs}s`
}
