import { getGithubToken } from './config.js';

export function parseRepo(repo: string): { owner: string; name: string } | null {
  const parts = repo.trim().split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  return { owner: parts[0]!, name: parts[1]! };
}

export async function postIssueComment(params: {
  repo: string;
  issueNumber: number;
  body: string;
}): Promise<{ url: string }> {
  const token = getGithubToken();
  if (!token) throw new Error('GITHUB_TOKEN not configured');

  const parsed = parseRepo(params.repo);
  if (!parsed) throw new Error(`Invalid repo format: ${params.repo}`);

  const url = `https://api.github.com/repos/${parsed.owner}/${parsed.name}/issues/${params.issueNumber}/comments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: params.body }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as { html_url?: string };
  return { url: data.html_url ?? url };
}

export async function verifyRepoAccess(repo: string): Promise<boolean> {
  const token = getGithubToken();
  if (!token) return false;

  const parsed = parseRepo(repo);
  if (!parsed) return false;

  const response = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.name}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  return response.ok;
}
