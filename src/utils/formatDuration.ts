export function formatDuration(startStr: string, endStr?: string | null): string {
  const start = new Date(startStr)
  const end = endStr ? new Date(endStr) : new Date()
  const diffMs = end.getTime() - start.getTime()
  const secs = Math.max(0, Math.floor(diffMs / 1000))
  const mins = Math.floor(secs / 60)
  const hrs = Math.floor(mins / 60)

  if (hrs > 0) return `${hrs}h ${mins % 60}m ${secs % 60}s`
  if (mins > 0) return `${mins}m ${secs % 60}s`
  return `${secs}s`
}
