import fs from 'node:fs';
import path from 'node:path';

function findEnvFile(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadEnvFile() {
  const envPath = findEnvFile();
  if (!envPath) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

export interface IntegrationsStatus {
  llm: 'anthropic' | 'disabled';
  github: 'enabled' | 'disabled';
  mode: 'live' | 'simulated';
}

export function getIntegrations(): IntegrationsStatus {
  const hasLlm = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasGithub = Boolean(process.env.GITHUB_TOKEN?.trim());
  const live = hasLlm || hasGithub;
  return {
    llm: hasLlm ? 'anthropic' : 'disabled',
    github: hasGithub ? 'enabled' : 'disabled',
    mode: live ? 'live' : 'simulated',
  };
}

export function getAnthropicApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key || null;
}

export function getGithubToken(): string | null {
  const token = process.env.GITHUB_TOKEN?.trim();
  return token || null;
}
