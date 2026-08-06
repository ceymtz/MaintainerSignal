import { REPORT_MARKER } from './render.js';
const API_ROOT = 'https://api.github.com';

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'maintainer-signal-action' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(`GitHub API ${method} ${path} failed (${response.status}): ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

export const getPullRequest = ({ owner, repo, pullNumber, token }) => request(`/repos/${owner}/${repo}/pulls/${pullNumber}`, { token });

export async function getPullRequestFiles({ owner, repo, pullNumber, token }) {
  const files = [];
  for (let page = 1; page <= 30; page += 1) {
    const batch = await request(`/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100&page=${page}`, { token });
    files.push(...batch);
    if (batch.length < 100) break;
  }
  return files;
}

export async function upsertReportComment({ owner, repo, pullNumber, token, body }) {
  let existing;
  for (let page = 1; page <= 10 && !existing; page += 1) {
    const comments = await request(`/repos/${owner}/${repo}/issues/${pullNumber}/comments?per_page=100&page=${page}`, { token });
    existing = comments.find((comment) => comment.body?.includes(REPORT_MARKER));
    if (comments.length < 100) break;
  }
  return existing
    ? request(`/repos/${owner}/${repo}/issues/comments/${existing.id}`, { token, method: 'PATCH', body: { body } })
    : request(`/repos/${owner}/${repo}/issues/${pullNumber}/comments`, { token, method: 'POST', body: { body } });
}
