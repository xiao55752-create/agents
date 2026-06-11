export type RunStatus =
  | 'pending'
  | 'queued'
  | 'provisioning'
  | 'running'
  | 'pr_opened'
  | 'needs_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ControlIntent = 'cancel' | 'retry' | 'approve' | null;

export { AVAILABLE_TOOLS, isToolName, type ToolName } from './tools.js';
export {
  BUILTIN_SKILLS,
  DEFAULT_SKILL_REFS,
  getBuiltinSkill,
  inferSkillRefsFromTools,
  normalizeAgentSkills,
  parseSkillRef,
  resolveAgentTools,
  resolveSkillsToTools,
  skillRef,
  type SkillSpec,
} from './skills.js';
export {
  computePlatformMetrics,
  formatMetricUsd,
  TOKEN_UNIT_PRICE_USD,
  type PlatformMetrics,
} from './metrics.js';

import { isToolName, type ToolName } from './tools.js';
import {
  DEFAULT_SKILL_REFS,
  inferSkillRefsFromTools,
  normalizeAgentSkills,
  resolveSkillsToTools,
} from './skills.js';

export interface AgentSpec {
  name: string;
  model: string;
  systemPrompt: string;
  /** 挂载的内置 Skill 引用，如 code-read@1.0.0 */
  skills: string[];
  /** 由 skills 推导的工具白名单（缓存，便于 Runtime 使用） */
  tools: ToolName[];
  limits: {
    maxTokens: number;
    timeoutMinutes: number;
    maxRetries: number;
    /** 月度 Token 预算（流控 Mock / Paperclip 式硬停参考） */
    monthlyBudgetTokens: number;
  };
}

export function validateAgentSpec(input: {
  name?: string;
  model?: string;
  systemPrompt?: string;
  skills?: string[];
  tools?: string[];
  limits?: Partial<AgentSpec['limits']>;
}): { ok: true; spec: AgentSpec } | { ok: false; error: string } {
  const name = input.name?.trim();
  if (!name) return { ok: false, error: 'name is required' };

  const model = input.model?.trim();
  if (!model) return { ok: false, error: 'model is required' };

  const systemPrompt = input.systemPrompt?.trim();
  if (!systemPrompt) return { ok: false, error: 'systemPrompt is required' };

  const skills = normalizeAgentSkills(input);
  const resolved = resolveSkillsToTools(skills);
  if (!resolved.ok) {
    const legacyTools = input.tools ?? [];
    if (legacyTools.length === 0) return { ok: false, error: resolved.error };
    for (const tool of legacyTools) {
      if (!isToolName(tool)) return { ok: false, error: `unknown tool: ${tool}` };
    }
    const inferredSkills = inferSkillRefsFromTools(legacyTools);
    return validateAgentSpec({ ...input, skills: inferredSkills, tools: undefined });
  }

  const maxTokens = input.limits?.maxTokens ?? 100000;
  const timeoutMinutes = input.limits?.timeoutMinutes ?? 30;
  const maxRetries = input.limits?.maxRetries ?? 2;
  const monthlyBudgetTokens = input.limits?.monthlyBudgetTokens ?? 500_000;

  if (maxTokens < 1000 || maxTokens > 1_000_000) {
    return { ok: false, error: 'maxTokens must be between 1000 and 1000000' };
  }
  if (timeoutMinutes < 1 || timeoutMinutes > 120) {
    return { ok: false, error: 'timeoutMinutes must be between 1 and 120' };
  }
  if (maxRetries < 0 || maxRetries > 10) {
    return { ok: false, error: 'maxRetries must be between 0 and 10' };
  }
  if (monthlyBudgetTokens < 10_000 || monthlyBudgetTokens > 50_000_000) {
    return { ok: false, error: 'monthlyBudgetTokens must be between 10000 and 50000000' };
  }

  return {
    ok: true,
    spec: {
      name,
      model,
      systemPrompt,
      skills: [...skills],
      tools: [...resolved.tools],
      limits: { maxTokens, timeoutMinutes, maxRetries, monthlyBudgetTokens },
    },
  };
}

export interface RunInput {
  repo: string;
  issueNumber?: number;
  issueTitle?: string;
  issueBody?: string;
}

export interface RunRecord {
  id: string;
  agentId: string;
  workflow: string;
  status: RunStatus;
  input: RunInput;
  output?: {
    prUrl?: string;
    branch?: string;
    summary?: string;
    changedFiles?: string[];
  };
  controlIntent: ControlIntent;
  reconcileBackoffUntil: string | null;
  reconcileAttempts: number;
  errorMessage?: string;
  tokensUsed: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorldSnapshot {
  run: RunRecord;
  now: string;
  runnerAvailable: boolean;
  readErrors: string[];
}

export type ReconcileAction =
  | { type: 'transition'; to: RunStatus; reason: string }
  | { type: 'noop'; reason: string }
  | { type: 'defer'; until: string; reason: string };

export const TERMINAL_STATUSES: RunStatus[] = ['completed', 'failed', 'cancelled'];

export const DEFAULT_AGENT: AgentSpec = {
  name: 'issue-fix-agent',
  model: 'claude-sonnet-4-20250514',
  systemPrompt:
    'You are an engineering agent. Fix the GitHub issue, run tests, and open a draft PR. Do not merge to main.',
  skills: [...DEFAULT_SKILL_REFS],
  tools: ['read_file', 'write_file', 'shell', 'run_tests', 'open_draft_pr'],
  limits: {
    maxTokens: 100000,
    timeoutMinutes: 30,
    maxRetries: 2,
    monthlyBudgetTokens: 500_000,
  },
};

export function reconcileRun(snapshot: WorldSnapshot): ReconcileAction {
  const { run } = snapshot;
  const status = run.status;

  if (run.controlIntent === 'cancel' && !TERMINAL_STATUSES.includes(status)) {
    return { type: 'transition', to: 'cancelled', reason: 'user-cancel' };
  }

  if (run.controlIntent === 'approve' && status === 'needs_approval') {
    return { type: 'transition', to: 'completed', reason: 'user-approve' };
  }

  if (run.controlIntent === 'retry' && status === 'failed') {
    return { type: 'transition', to: 'queued', reason: 'user-retry' };
  }

  if (run.reconcileBackoffUntil && run.reconcileBackoffUntil > snapshot.now) {
    return { type: 'noop', reason: 'backoff' };
  }

  if (snapshot.readErrors.length > 0) {
    const until = new Date(Date.now() + 30_000).toISOString();
    return { type: 'defer', until, reason: 'read-error' };
  }

  switch (status) {
    case 'pending':
      return { type: 'transition', to: 'queued', reason: 'initial-schedule' };
    case 'queued':
      if (snapshot.runnerAvailable) {
        return { type: 'transition', to: 'provisioning', reason: 'runner-available' };
      }
      return { type: 'noop', reason: 'waiting-runner' };
    case 'provisioning':
    case 'running':
    case 'pr_opened':
      return { type: 'noop', reason: 'executor-in-progress' };
    case 'needs_approval':
      return { type: 'noop', reason: 'awaiting-approve' };
    default:
      return { type: 'noop', reason: 'terminal-or-stable' };
  }
}

export function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
