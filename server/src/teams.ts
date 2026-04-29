import type { WorkflowRun } from './githubPoll.js'

interface Fact {
  name: string
  value: string
}

/**
 * Build a Teams MessageCard payload describing a started workflow run.
 * MessageCard is the legacy connector format; it's universally supported by Teams
 * (both classic Office 365 connectors and Power Automate webhooks accept it).
 */
export function buildRunMessage(
  run: WorkflowRun,
  inputs: Record<string, string | undefined> | undefined,
  dashboardUrl: string
): unknown {
  const actor = run.triggering_actor?.login ?? run.actor?.login ?? 'unknown'
  const workflowName = run.display_title || run.name

  const facts: Fact[] = [
    { name: 'Repository', value: `${run._owner}/${run._repo}` },
    { name: 'Workflow', value: workflowName },
    { name: 'Run', value: `#${run.run_number}` },
    { name: 'Branch', value: run.head_branch || '—' },
    { name: 'Triggered by', value: actor },
    { name: 'Event', value: run.event || '—' },
  ]

  if (inputs?.ENVIRONMENT) {
    facts.push({ name: 'ENVIRONMENT', value: inputs.ENVIRONMENT })
  }
  if (inputs?.SUBSCRIPTION) {
    facts.push({ name: 'SUBSCRIPTION', value: inputs.SUBSCRIPTION })
  }

  // Theme color: green for production, amber for everything else.
  const themeColor = inputs?.ENVIRONMENT === 'production' ? '3FB950' : 'D29922'

  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: `Workflow run started: ${run._owner}/${run._repo} #${run.run_number}`,
    themeColor,
    title: '🚀 Workflow run started',
    sections: [
      {
        activityTitle: `**${run._owner}/${run._repo}**`,
        activitySubtitle: workflowName,
        facts,
        markdown: true,
      },
    ],
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'Open in dashboard',
        targets: [{ os: 'default', uri: dashboardUrl }],
      },
      {
        '@type': 'OpenUri',
        name: 'Open run on GitHub',
        targets: [{ os: 'default', uri: run.html_url }],
      },
    ],
  }
}

/**
 * Build a simple test message used by the "Test" button in Settings.
 */
export function buildTestMessage(dashboardUrl: string): unknown {
  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: 'Test notification from GitHub Actions Dashboard',
    themeColor: '0076D7',
    title: '✅ Test notification',
    sections: [
      {
        activityTitle: 'GitHub Actions Dashboard — notifier is wired up',
        text: 'If you see this message, your Teams webhook is configured correctly.',
      },
    ],
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'Open dashboard',
        targets: [{ os: 'default', uri: dashboardUrl }],
      },
    ],
  }
}

/**
 * POST a payload to the Teams webhook URL. Throws on non-2xx.
 */
export async function sendTeamsMessage(webhookUrl: string, payload: unknown): Promise<void> {
  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`Teams webhook returned ${resp.status}: ${body.slice(0, 200)}`)
  }
}
