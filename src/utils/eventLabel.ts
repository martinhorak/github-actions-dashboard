const EVENT_MAP: Record<string, string> = {
  push: 'push',
  pull_request: 'PR',
  schedule: 'schedule',
  workflow_dispatch: 'manual',
  merge_group: 'merge',
}

export function eventLabel(event: string): string {
  return EVENT_MAP[event] || event
}
