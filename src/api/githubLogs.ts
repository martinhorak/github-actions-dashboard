import { ghFetchText } from './github'
import { parseInputs } from '../utils/parseInputsLog'

/**
 * Fetch a job's logs and extract requested input values from the "Inputs" group.
 *
 * GitHub's logs endpoint (302 → signed Azure Blob URL) is followed automatically
 * by `fetch`. The `Authorization` header is dropped on the cross-origin redirect,
 * but the SAS token in the redirect target makes that fine.
 *
 * Returns `{}` if the log isn't available yet (HTTP 404 from GitHub).
 */
export async function fetchJobInputs(
  owner: string,
  repo: string,
  jobId: number,
  token: string,
  keys: readonly string[]
): Promise<Record<string, string | undefined>> {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`
  const text = await ghFetchText(url, token)
  if (!text) return {}
  return parseInputs(text, keys)
}
