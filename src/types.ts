export interface GitHubOrg {
  login: string
  avatar_url: string
  type?: 'Organization' | 'User'
}

export interface GitHubRepo {
  name: string
  html_url: string
  owner: { login: string }
}

export interface GitHubActor {
  login: string
  avatar_url: string
}

export interface HeadCommit {
  message: string
}

export interface WorkflowRun {
  id: number
  name: string
  display_title?: string
  status: string
  html_url: string
  head_branch: string
  event: string
  run_number: number
  run_started_at?: string
  created_at: string
  head_commit?: HeadCommit
  triggering_actor?: GitHubActor
  actor?: GitHubActor
  jobs_url: string
  repository?: { name: string; html_url: string }
  _repo?: GitHubRepo
  _jobs?: WorkflowJob[]
}

export interface WorkflowJob {
  id: number
  name: string
  status: string
  conclusion: string | null
  started_at: string | null
  html_url: string
}

export interface RunsData {
  runs: WorkflowRun[]
}

export interface RepoGroup {
  repo: GitHubRepo
  runs: WorkflowRun[]
}
