export type {
  AgentSpec,
  PlatformMetrics,
  RunStatus,
  SkillSpec,
  ToolName,
} from '@agentos/shared';

export { computePlatformMetrics } from '@agentos/shared';

export {
  BUILTIN_SKILLS,
  DEFAULT_SKILL_REFS,
  inferSkillRefsFromTools,
  skillRef,
} from '@agentos/shared';

export { getSkill as getBuiltinSkill, isCustomSkill, listAllSkills, resolveAgentTools } from './skills/catalog';

export interface Agent {
  id: string;
  name: string;
  spec: import('@agentos/shared').AgentSpec;
  createdAt: string;
  updatedAt: string;
}

export interface RunOutputSnapshot {
  attempt: number;
  summary?: string;
  changedFiles?: string[];
  revisionApplied?: string;
  branch?: string;
  savedAt: string;
  trigger?: 'revise' | 'reject';
}

export interface AuditEvent {
  id: number;
  type: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface Run {
  id: string;
  agentId: string;
  workflow: string;
  status: import('@agentos/shared').RunStatus;
  input: {
    repo: string;
    issueNumber?: number;
    issueTitle?: string;
    issueBody?: string;
    /** 验收标准 / KPI，写入 PR 摘要与审计 */
    acceptanceCriteria?: string;
  };
  /** 上一轮输出快照（要求修改 / 打回时追加） */
  outputHistory?: RunOutputSnapshot[];
  output?: {
    prUrl?: string;
    branch?: string;
    summary?: string;
    changedFiles?: string[];
    revisionApplied?: string;
    attempt?: number;
  };
  /** 待带入下次执行的验收修改说明 */
  pendingRevision?: string;
  /** 打回重做原因（下次执行摘要中体现） */
  pendingRejectReason?: string;
  rejectRetryCount?: number;
  runAttempt?: number;
  completionGate?: 'approve' | 'revise';
  /** Gate 前自动检查结果（进入 needs_approval 或 failed 时写入） */
  gateChecks?: import('./gateChecks').GateCheckSnapshot;
  tokensUsed: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  id: number;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
  ts: string;
}

export interface IntegrationsStatus {
  llm: 'anthropic' | 'disabled';
  github: 'enabled' | 'disabled';
  mode: 'live' | 'simulated';
}
