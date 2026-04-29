export interface WorkflowJob {
  id: number
  name: string
  status: string
  conclusion: string | null
}

/**
 * Locate the `set-env` job in a run's jobs list. Convention follows the
 * reusable workflow at `DEAPCZ/deap-github-actions/.github/workflows/deap_set_env.yml`,
 * which GitHub names as `<caller-job-id> / set-env` (or just `set-env` when called directly).
 */
export function findSetEnvJob(jobs?: WorkflowJob[]): WorkflowJob | undefined {
  if (!jobs) return undefined
  return jobs.find((j) => j.name === 'set-env' || j.name.endsWith(' / set-env'))
}
