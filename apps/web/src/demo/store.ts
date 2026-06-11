import { BUILTIN_SKILLS, computePlatformMetrics } from '@agentos/shared';
import { DEFAULT_SPEC } from '../agentConfig';
import {
  agentHasTestCapability,
  buildGateCheckSnapshot,
  shouldSimulateTestFailure,
  type GateCheckSnapshot,
} from '../gateChecks';
import { computeAgentIterationInsights, type IterationInsight } from '../iterationInsights';
import { appendOutputHistory } from '../runRounds';
import { inferSkillRefsFromTools, resolveAgentTools } from '../types';
import type {
  Agent,
  AgentSpec,
  AuditEvent,
  IntegrationsStatus,
  LogEntry,
  PlatformMetrics,
  Run,
  RunStatus,
} from '../types';

const STORAGE_KEY = 'agentos-demo-v4';
const LEGACY_STORAGE_KEYS = ['agentos-demo-v3', 'agentos-demo-v2'];
const EXPORT_VERSION = 1;

interface PersistedState {
  agents: Agent[];
  runs: Run[];
  logsByRun: Record<string, LogEntry[]>;
  auditByRun: Record<string, AuditEvent[]>;
  logId: number;
  auditId: number;
}

interface ExportedState extends PersistedState {
  version: number;
  exportedAt: string;
  source: 'agentos-local-mode';
}

let logId = 1;
let auditId = 1;
let agents: Agent[] = [];
let runs: Run[] = [];
const logsByRun = new Map<string, LogEntry[]>();
const auditByRun = new Map<string, AuditEvent[]>();
const logListeners = new Map<string, Set<(log: LogEntry) => void>>();
const simTimers = new Map<string, ReturnType<typeof setTimeout>[]>();
let hydrated = false;

function ts() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function persistState() {
  if (typeof localStorage === 'undefined') return;
  const data: PersistedState = {
    agents,
    runs,
    logId,
    auditId,
    logsByRun: Object.fromEntries(logsByRun.entries()),
    auditByRun: Object.fromEntries(auditByRun.entries()),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function currentPersistedState(): PersistedState {
  return {
    agents,
    runs,
    logId,
    auditId,
    logsByRun: Object.fromEntries(logsByRun.entries()),
    auditByRun: Object.fromEntries(auditByRun.entries()),
  };
}

function applyPersistedState(data: PersistedState) {
  for (const runId of runs.map((r) => r.id)) clearSim(runId);
  agents = normalizePersistedAgents(data.agents ?? []);
  if (agents.length === 0) agents = [defaultAgent()];
  runs = data.runs ?? [];
  logId = data.logId ?? 1;
  auditId = data.auditId ?? 1;
  logsByRun.clear();
  auditByRun.clear();
  logListeners.clear();
  simTimers.clear();
  for (const [runId, entries] of Object.entries(data.logsByRun ?? {})) {
    logsByRun.set(runId, entries);
  }
  for (const [runId, entries] of Object.entries(data.auditByRun ?? {})) {
    auditByRun.set(runId, entries);
  }
  persistState();
}

function normalizePersistedAgents(list: Agent[]): Agent[] {
  return list.map((a) => ({
    ...a,
    spec: normalizeSpec(a.spec),
  }));
}

function migrateLegacyStorage(): PersistedState | null {
  if (typeof localStorage === 'undefined') return null;
  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as PersistedState;
      data.agents = normalizePersistedAgents(data.agents ?? []);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.removeItem(key);
      return data;
    } catch {
      /* try next key */
    }
  }
  return null;
}

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  if (typeof localStorage === 'undefined') return;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let data: PersistedState | null = null;
    if (raw) {
      data = JSON.parse(raw) as PersistedState;
    } else {
      data = migrateLegacyStorage();
    }
    if (!data) return;
    applyPersistedState(data);
    resumeInterruptedRuns();
  } catch {
    /* ignore corrupt storage */
  }
}

function getRunLogs(runId: string): LogEntry[] {
  if (!logsByRun.has(runId)) logsByRun.set(runId, []);
  return logsByRun.get(runId)!;
}

function getRunAudit(runId: string): AuditEvent[] {
  if (!auditByRun.has(runId)) auditByRun.set(runId, []);
  return auditByRun.get(runId)!;
}

function emitLog(runId: string, level: LogEntry['level'], message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = { id: logId++, level, message, meta, ts: ts() };
  getRunLogs(runId).push(entry);
  logListeners.get(runId)?.forEach((fn) => fn(entry));
  persistState();
}

function emitAudit(runId: string, type: string, payload?: Record<string, unknown>) {
  const entry: AuditEvent = { id: auditId++, type, payload, createdAt: ts() };
  getRunAudit(runId).push(entry);
  persistState();
}

function transitionRun(runId: string, from: RunStatus, to: RunStatus, reason: string) {
  updateRun(runId, { status: to });
  emitAudit(runId, 'reconcile.transition', { from, to, reason });
  emitLog(runId, 'info', `Status: ${from} → ${to}`, { reason });
}

function updateRun(runId: string, patch: Partial<Run>) {
  runs = runs.map((r) => (r.id === runId ? { ...r, ...patch, updatedAt: ts() } : r));
  persistState();
}

function clearSim(runId: string) {
  simTimers.get(runId)?.forEach(clearTimeout);
  simTimers.delete(runId);
}

function later(runId: string, ms: number, fn: () => void) {
  const t = setTimeout(fn, ms);
  if (!simTimers.has(runId)) simTimers.set(runId, []);
  simTimers.get(runId)!.push(t);
}

function normalizeSpec(spec: AgentSpec): AgentSpec {
  const skills = spec.skills?.length ? [...spec.skills] : inferSkillRefsFromTools(spec.tools ?? []);
  const tools = resolveAgentTools({ skills, tools: spec.tools });
  return {
    ...spec,
    skills,
    tools: [...tools],
    limits: {
      maxTokens: spec.limits?.maxTokens ?? 100_000,
      timeoutMinutes: spec.limits?.timeoutMinutes ?? 30,
      maxRetries: spec.limits?.maxRetries ?? 2,
      monthlyBudgetTokens: spec.limits?.monthlyBudgetTokens ?? 500_000,
    },
  };
}

function mockChangedFiles(run: Run): string[] {
  const primary = run.input.issueTitle?.includes('登录') ? 'src/auth/login.ts' : 'src/handler.ts';
  const base = [primary, primary.replace(/\.ts$/, '.test.ts'), 'package.json'];
  const attempt = run.runAttempt ?? 1;
  if (attempt <= 1) return base;
  if (run.pendingRevision) {
    return [...base, 'src/components/Toast.tsx'];
  }
  if (run.pendingRejectReason) {
    return [primary, 'src/middleware/auth.ts', primary.replace(/\.ts$/, '.test.ts')];
  }
  return base;
}

function cloneSpec(spec: AgentSpec): AgentSpec {
  return normalizeSpec({
    ...spec,
    skills: [...(spec.skills ?? [])],
    tools: [...spec.tools],
    limits: { ...spec.limits },
  });
}

function defaultAgent(): Agent {
  const t = ts();
  return {
    id: uid('agt'),
    name: DEFAULT_SPEC.name,
    spec: cloneSpec({ ...DEFAULT_SPEC, name: DEFAULT_SPEC.name }),
    createdAt: t,
    updatedAt: t,
  };
}

function getAgentForRun(run: Run): Agent | undefined {
  return agents.find((a) => a.id === run.agentId);
}

function resumeInterruptedRuns() {
  for (const run of runs) {
    if (['completed', 'failed', 'cancelled'].includes(run.status)) continue;
    clearSim(run.id);
    logsByRun.set(run.id, []);
    updateRun(run.id, { status: 'pending', output: undefined, tokensUsed: 0 });
    playDemoRun(run.id);
  }
}

function playDemoRun(runId: string) {
  const run = runs.find((r) => r.id === runId);
  if (!run) return;
  playDemoRunFlow(runId);
}

function failRun(
  runId: string,
  from: RunStatus,
  reason: string,
  errorMessage: string,
  gateChecks: GateCheckSnapshot,
  tokensUsed?: number,
) {
  transitionRun(runId, from, 'failed', reason);
  updateRun(runId, {
    errorMessage,
    gateChecks,
    output: undefined,
    tokensUsed: tokensUsed ?? runs.find((r) => r.id === runId)?.tokensUsed ?? 0,
  });
  emitAudit(runId, 'run.failed', { reason, gateChecks: gateChecks.failures });
  emitLog(runId, 'error', errorMessage, { gateChecks: gateChecks.failures });
}

function agentBudgetOkForRun(agentId: string, projectedTokens: number): boolean {
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return true;
  const budget = agent.spec.limits.monthlyBudgetTokens ?? 500_000;
  return demoAgentMonthlySpend(agentId) + projectedTokens <= budget;
}

function buildRunSummary(run: Run, agentName: string): string {
  const base = `Fix: ${run.input.issueTitle ?? 'automated change'}（${agentName}）`;
  const parts = [base];
  const criteria = run.input.acceptanceCriteria?.trim();
  if (criteria) {
    parts.push(`验收标准：\n${criteria}`);
  }
  if (run.pendingRevision) {
    parts.push(`按验收意见修改：${run.pendingRevision}`);
  }
  if (run.pendingRejectReason) {
    parts.push(`打回后重试：${run.pendingRejectReason}`);
  }
  const attempt = run.runAttempt ?? 1;
  if (attempt > 1) {
    parts.push(`执行轮次：第 ${attempt} 次`);
  }
  return parts.join('\n\n');
}

function playDemoRunFlow(runId: string) {
  const run = runs.find((r) => r.id === runId);
  if (!run) return;

  const agent = getAgentForRun(run);
  const agentName = agent?.name ?? DEFAULT_SPEC.name;
  const tools = [...resolveAgentTools(agent?.spec ?? DEFAULT_SPEC)];
  const model = agent?.spec.model ?? DEFAULT_SPEC.model;
  const toolSet = new Set(tools);
  const canTest = agentHasTestCapability(tools);
  const simulateTestFail = canTest && shouldSimulateTestFailure(run);

  emitAudit(runId, 'skill.resolved', { skills: agent?.spec.skills ?? DEFAULT_SPEC.skills, tools });

  const policyDenyList = ['git_push', 'deploy_prod', 'delete_repo'] as const;
  const blocked = policyDenyList.find((t) => !toolSet.has(t as (typeof tools)[number]));
  const shouldIntercept =
    blocked &&
    ((run.runAttempt ?? 1) > 1 ||
      run.input.issueTitle?.includes('越权') ||
      run.input.issueBody?.includes('越权'));
  if (shouldIntercept && blocked) {
    emitAudit(runId, 'tool.intercepted', { tools: [blocked], reason: 'runtime-policy-deny-list' });
    emitLog(runId, 'info', `Blocked unauthorized tool: ${blocked}`, { tools: [blocked] });
  }

  const branch = `agentos/run-${runId.slice(4, 12)}`;
  const prUrl = `https://github.com/${run.input.repo}/pull/999`;
  const summary = buildRunSummary(run, agentName);
  const changedFiles = mockChangedFiles(run);
  const revisionApplied = run.pendingRevision;
  const attempt = run.runAttempt ?? 1;
  const projectedTokens = Math.min(agent?.spec.limits.maxTokens ?? 100_000, 8000 + Math.floor(Math.random() * 6000));

  type TimelineItem = { at: number; act?: () => void };
  const timeline: TimelineItem[] = [
    { at: 400, act: () => emitLog(runId, 'info', `Run created for ${run.input.repo}`, { agentName, model }) },
    { at: 700, act: () => transitionRun(runId, 'pending', 'queued', 'initial-schedule') },
    {
      at: 1200,
      act: () => {
        transitionRun(runId, 'queued', 'provisioning', 'runner-available');
        emitLog(runId, 'info', `Agent ${agentName} assigned`, { model });
      },
    },
    { at: 1700, act: () => emitLog(runId, 'info', `Cloning ${run.input.repo}...`) },
    { at: 2200, act: () => transitionRun(runId, 'provisioning', 'running', 'executor-start') },
  ];

  let cursor = 2800;

  if (toolSet.has('read_file')) {
    timeline.push({
      at: cursor,
      act: () =>
        emitLog(runId, 'step', 'Reading issue context and relevant source files', { tool: 'read_file', agentName }),
    });
    cursor += 700;
  }

  if (run.pendingRevision) {
    timeline.push({
      at: cursor,
      act: () =>
        emitLog(runId, 'step', `Addressing reviewer feedback: ${run.pendingRevision}`, {
          tool: 'read_file',
          agentName,
          revisionNotes: run.pendingRevision,
        }),
    });
    cursor += 700;
  }

  if (toolSet.has('write_file')) {
    timeline.push({
      at: cursor,
      act: () => emitLog(runId, 'step', 'Applying fix to src/handler.ts', { tool: 'write_file', agentName }),
    });
    cursor += 700;
  }

  if (canTest) {
    const tool = toolSet.has('run_tests') ? 'run_tests' : 'shell';
    timeline.push({
      at: cursor,
      act: () => emitLog(runId, 'step', 'Running npm test', { tool, agentName }),
    });
    cursor += 700;

    if (simulateTestFail) {
      timeline.push({
        at: cursor,
        act: () => {
          emitLog(runId, 'error', 'Tests failed: 2 suites failed, 5 tests failed', {
            tool: 'run_tests',
            agentName,
            failedSuites: 2,
            failedTests: 5,
          });
          emitAudit(runId, 'tests.failed', {
            reason: 'automated-tests-failed',
            hint: '在 Issue 标题或正文中含「测试失败」可复现此场景',
          });
          const checks = buildGateCheckSnapshot(run, agent, tools, {
            testsRan: true,
            testsPassed: false,
            hasDiff: changedFiles.length > 0,
            budgetOk: agentBudgetOkForRun(run.agentId, projectedTokens),
            prReady: false,
          });
          failRun(
            runId,
            'running',
            'tests-failed',
            '自动化测试未通过，未生成 Draft PR，任务未进入 Gate',
            checks,
            Math.round(projectedTokens * 0.6),
          );
        },
      });
      for (const item of timeline) {
        later(runId, item.at, () => item.act?.());
      }
      return;
    }

    timeline.push({
      at: cursor,
      act: () => emitLog(runId, 'step', 'All tests passed (simulated)', { tool: 'run_tests', agentName }),
    });
    cursor += 700;
  }

  const openPr = toolSet.has('open_draft_pr');

  if (openPr) {
    timeline.push({
      at: cursor,
      act: () => {
        transitionRun(runId, 'running', 'pr_opened', 'draft-pr-ready');
        updateRun(runId, {
          output: { prUrl, branch, summary, changedFiles, revisionApplied, attempt },
          pendingRevision: undefined,
          pendingRejectReason: undefined,
          tokensUsed: projectedTokens,
        });
        emitLog(runId, 'info', `Draft PR opened: ${prUrl}`, { branch, agentName, changedFiles, revisionApplied });
        emitAudit(runId, 'pr.opened', { prUrl, branch, summary, changedFiles, revisionApplied, attempt });
      },
    });
    cursor += 400;
  } else {
    timeline.push({
      at: cursor,
      act: () => {
        updateRun(runId, {
          output: { branch, summary, changedFiles, revisionApplied, attempt },
          pendingRevision: undefined,
          pendingRejectReason: undefined,
          tokensUsed: projectedTokens,
        });
        emitLog(runId, 'info', 'Fix applied locally (no PR tool enabled)', { branch, agentName });
      },
    });
    cursor += 400;
  }

  timeline.push({
    at: cursor,
    act: () => {
      const current = runs.find((r) => r.id === runId);
      if (!current || current.status === 'failed') return;

      const hasDiff = (current.output?.changedFiles?.length ?? 0) > 0;
      const budgetOk = agentBudgetOkForRun(current.agentId, current.tokensUsed);
      const prReady = openPr ? Boolean(current.output?.summary && current.output?.branch) : hasDiff;
      const checks = buildGateCheckSnapshot(current, agent, tools, {
        testsRan: canTest,
        testsPassed: canTest,
        hasDiff,
        budgetOk,
        prReady,
      });

      if (!checks.passed) {
        failRun(
          runId,
          current.status,
          'gate-precheck-failed',
          `Gate 前检查未通过：${checks.failures.join('；')}`,
          checks,
        );
        return;
      }

      updateRun(runId, { gateChecks: checks });
      emitAudit(runId, 'gate.precheck_passed', {
        items: checks.items.map((i) => ({ id: i.id, ok: i.ok })),
      });
      const prev = current.status;
      transitionRun(runId, prev, 'needs_approval', 'awaiting-human');
      emitLog(runId, 'info', 'Gate pre-check passed — waiting for human approval', { agentName });
    },
  });

  for (const item of timeline) {
    later(runId, item.at, () => item.act?.());
  }
}

export function initDemoStore() {
  hydrateFromStorage();
  if (agents.length > 0) return;
  agents = [defaultAgent()];
  persistState();
}

export function demoIntegrations(): IntegrationsStatus {
  return { llm: 'disabled', github: 'disabled', mode: 'simulated' };
}

export function demoFetchSkills() {
  return BUILTIN_SKILLS.map((s) => ({ ...s, tools: [...s.tools] }));
}

export function demoAgentIterationInsights(agentId: string): IterationInsight[] {
  initDemoStore();
  const agent = agents.find((a) => a.id === agentId);
  const agentRuns = runs.filter((r) => r.agentId === agentId);
  const audits: Record<string, AuditEvent[]> = {};
  for (const run of agentRuns) {
    audits[run.id] = getRunAudit(run.id);
  }
  const budget = agent?.spec.limits.monthlyBudgetTokens ?? 500_000;
  const skillCount = agent?.spec.skills?.length ?? agent?.spec.tools.length ?? 0;
  return computeAgentIterationInsights(
    agentRuns,
    audits,
    demoAgentMonthlySpend(agentId),
    budget,
    skillCount,
  );
}

export function demoFetchMetrics(): PlatformMetrics {
  initDemoStore();
  const audits: Record<string, AuditEvent[]> = {};
  for (const run of runs) {
    audits[run.id] = getRunAudit(run.id);
  }
  return computePlatformMetrics(runs, audits);
}

export function demoFetchAudit(runId: string): AuditEvent[] {
  initDemoStore();
  return [...getRunAudit(runId)];
}

export function demoFetchAgents(): Agent[] {
  initDemoStore();
  return agents.map((a) => ({
    ...a,
    spec: cloneSpec(a.spec),
  }));
}

export function demoFetchAgent(agentId: string): Agent {
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) throw new Error('Agent not found');
  return demoFetchAgents().find((a) => a.id === agentId)!;
}

export function demoCreateAgent(name: string, spec: AgentSpec): Agent {
  initDemoStore();
  const t = ts();
  const agent: Agent = { id: uid('agt'), name, spec: cloneSpec({ ...spec, name }), createdAt: t, updatedAt: t };
  agents.push(agent);
  persistState();
  return agent;
}

export function demoUpdateAgent(agentId: string, name: string, spec: AgentSpec): Agent {
  const idx = agents.findIndex((a) => a.id === agentId);
  if (idx === -1) throw new Error('Agent not found');
  agents[idx] = { ...agents[idx]!, name, spec: cloneSpec({ ...spec, name }), updatedAt: ts() };
  persistState();
  return demoFetchAgent(agentId);
}

export function demoFetchRuns(status?: string): Run[] {
  initDemoStore();
  if (status) return runs.filter((r) => r.status === status);
  return [...runs];
}

export function demoFetchRun(runId: string): Run {
  initDemoStore();
  const run = runs.find((r) => r.id === runId);
  if (!run) throw new Error('Run not found');
  return { ...run };
}

export function demoCreateRun(body: {
  repo: string;
  issueNumber?: number;
  issueTitle?: string;
  issueBody?: string;
  acceptanceCriteria?: string;
  agentId?: string;
}): Run {
  initDemoStore();
  const agentId = body.agentId ?? agents[0]!.id;
  const budgetStatus = demoAgentBudgetStatus(agentId);
  if (budgetStatus === 'exceeded') {
    throw new Error('该智能体本月 Token 预算已用尽，请在智能体页调整预算或等待下月');
  }
  const t = ts();
  const run: Run = {
    id: uid('run'),
    agentId,
    workflow: 'issue-to-pr',
    status: 'pending',
    input: {
      repo: body.repo,
      issueNumber: body.issueNumber,
      issueTitle: body.issueTitle,
      issueBody: body.issueBody,
      acceptanceCriteria: body.acceptanceCriteria?.trim() || undefined,
    },
    tokensUsed: 0,
    runAttempt: 1,
    outputHistory: [],
    createdAt: t,
    updatedAt: t,
  };
  runs.unshift(run);
  emitAudit(run.id, 'run.created', {
    input: run.input,
    workflow: run.workflow,
    acceptanceCriteria: run.input.acceptanceCriteria,
  });
  persistState();
  playDemoRun(run.id);
  return { ...run };
}

export function demoApproveRun(runId: string) {
  clearSim(runId);
  const run = runs.find((r) => r.id === runId);
  const from = run?.status ?? 'needs_approval';
  const gate: Run['completionGate'] =
    run?.output?.revisionApplied || (run?.rejectRetryCount ?? 0) > 0 ? 'revise' : 'approve';
  updateRun(runId, { status: 'completed', completionGate: gate });
  emitAudit(runId, 'reconcile.transition', { from, to: 'completed', reason: 'gate-approve' });
  emitAudit(runId, 'run.approved', { by: 'user', gate: 'approve', completionGate: gate });
  emitLog(runId, 'info', 'Gate approved — task completed');
}

export function demoRejectRun(runId: string, reason?: string) {
  const run = runs.find((r) => r.id === runId);
  if (!run || run.status !== 'needs_approval') throw new Error('Only runs awaiting approval can be rejected');
  const message = reason?.trim() || '方案不符合要求，需整体重做';
  clearSim(runId);
  const retryCount = (run.rejectRetryCount ?? 0) + 1;
  const history = appendOutputHistory(run, 'reject');
  emitAudit(runId, 'run.reject_retry', { by: 'user', gate: 'reject', reason: message, retryCount });
  emitAudit(runId, 'run.round_archived', { attempt: run.output?.attempt ?? run.runAttempt, trigger: 'reject' });
  emitLog(runId, 'info', `Gate reject — re-queued for retry (${retryCount})`, { reason: message, retryCount });
  updateRun(runId, {
    status: 'pending',
    output: undefined,
    errorMessage: undefined,
    gateChecks: undefined,
    outputHistory: history,
    pendingRejectReason: message,
    pendingRevision: undefined,
    rejectRetryCount: retryCount,
    runAttempt: (run.runAttempt ?? 1) + 1,
  });
  emitAudit(runId, 'reconcile.transition', { from: 'needs_approval', to: 'pending', reason: 'gate-reject-retry' });
  playDemoRunFlow(runId);
}

export function demoReviseRun(runId: string, notes: string) {
  const run = runs.find((r) => r.id === runId);
  if (!run || run.status !== 'needs_approval') throw new Error('Only runs awaiting approval can be revised');
  const revision = notes.trim();
  if (!revision) throw new Error('请填写修改要求');
  clearSim(runId);
  const history = appendOutputHistory(run, 'revise');
  emitAudit(runId, 'run.revision_requested', { by: 'user', gate: 'revise', notes: revision });
  emitAudit(runId, 'run.round_archived', { attempt: run.output?.attempt ?? run.runAttempt, trigger: 'revise' });
  emitLog(runId, 'info', `Revision requested: ${revision}`, { notes: revision });
  updateRun(runId, {
    status: 'pending',
    output: undefined,
    errorMessage: undefined,
    gateChecks: undefined,
    outputHistory: history,
    pendingRevision: revision,
    pendingRejectReason: undefined,
    runAttempt: (run.runAttempt ?? 1) + 1,
  });
  emitAudit(runId, 'reconcile.transition', { from: 'needs_approval', to: 'pending', reason: 'gate-revise' });
  emitLog(runId, 'info', `Applying revision notes from reviewer`, { revisionNotes: revision });
  playDemoRunFlow(runId);
}

export function demoCancelRun(runId: string) {
  clearSim(runId);
  const run = runs.find((r) => r.id === runId);
  if (run && !['completed', 'failed', 'cancelled'].includes(run.status)) {
    transitionRun(runId, run.status, 'cancelled', 'user-cancel');
  } else {
    updateRun(runId, { status: 'cancelled' });
  }
  emitAudit(runId, 'run.cancelled', { by: 'user' });
  emitLog(runId, 'info', 'Run cancelled by user');
}

export function demoRetryRun(runId: string) {
  const run = runs.find((r) => r.id === runId);
  if (!run || run.status !== 'failed') throw new Error('Only failed runs can be retried');
  clearSim(runId);
  logsByRun.set(runId, []);
  updateRun(runId, {
    status: 'pending',
    output: undefined,
    tokensUsed: 0,
    errorMessage: undefined,
    gateChecks: undefined,
  });
  emitAudit(runId, 'run.retried', {});
  playDemoRun(runId);
}

export function demoDeleteRun(runId: string) {
  clearSim(runId);
  runs = runs.filter((r) => r.id !== runId);
  logsByRun.delete(runId);
  auditByRun.delete(runId);
  persistState();
}

export function demoDuplicateAgent(agentId: string): Agent {
  initDemoStore();
  const source = agents.find((a) => a.id === agentId);
  if (!source) throw new Error('Agent not found');
  const baseName = source.name.replace(/-copy\d*$/, '');
  let name = `${baseName}-copy`;
  let n = 2;
  while (agents.some((a) => a.name === name)) {
    name = `${baseName}-copy${n++}`;
  }
  return demoCreateAgent(name, cloneSpec(source.spec));
}

export function demoDeleteAgent(agentId: string) {
  initDemoStore();
  if (agents.length <= 1) throw new Error('至少保留一个智能体');
  const idx = agents.findIndex((a) => a.id === agentId);
  if (idx === -1) throw new Error('Agent not found');
  const fallbackId = agents.find((a) => a.id !== agentId)!.id;
  agents.splice(idx, 1);
  runs = runs.map((r) => (r.agentId === agentId ? { ...r, agentId: fallbackId } : r));
  persistState();
}

export function demoAgentMonthlySpend(agentId: string): number {
  initDemoStore();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return runs
    .filter((r) => r.agentId === agentId && new Date(r.createdAt).getTime() >= monthStart)
    .reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0);
}

export type AgentBudgetStatus = 'ok' | 'warn' | 'exceeded';

export function demoAgentBudgetStatus(agentId: string): AgentBudgetStatus {
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return 'ok';
  const budget = agent.spec.limits.monthlyBudgetTokens ?? 500_000;
  const spend = demoAgentMonthlySpend(agentId);
  if (spend >= budget) return 'exceeded';
  if (budget > 0 && spend / budget >= 0.8) return 'warn';
  return 'ok';
}

export function demoIsAgentBudgetExceeded(agentId: string): boolean {
  return demoAgentBudgetStatus(agentId) === 'exceeded';
}

export function demoResetAll() {
  for (const runId of runs.map((r) => r.id)) clearSim(runId);
  agents = [defaultAgent()];
  runs = [];
  logsByRun.clear();
  auditByRun.clear();
  logListeners.clear();
  simTimers.clear();
  persistState();
}

export function demoExportState(): string {
  initDemoStore();
  const data: ExportedState = {
    ...currentPersistedState(),
    version: EXPORT_VERSION,
    exportedAt: ts(),
    source: 'agentos-local-mode',
  };
  return JSON.stringify(data, null, 2);
}

export function demoImportState(raw: string) {
  let parsed: Partial<ExportedState>;
  try {
    parsed = JSON.parse(raw) as Partial<ExportedState>;
  } catch {
    throw new Error('导入失败：文件不是有效 JSON');
  }
  if (parsed.source !== 'agentos-local-mode') {
    throw new Error('导入失败：不是 agentOS 本地模式导出文件');
  }
  if (!Array.isArray(parsed.agents) || !Array.isArray(parsed.runs)) {
    throw new Error('导入失败：缺少 agents 或 runs 数据');
  }
  applyPersistedState({
    agents: parsed.agents,
    runs: parsed.runs,
    logsByRun: parsed.logsByRun ?? {},
    auditByRun: parsed.auditByRun ?? {},
    logId: parsed.logId ?? 1,
    auditId: parsed.auditId ?? 1,
  });
  resumeInterruptedRuns();
}

export function demoSubscribeLogs(runId: string, onLog: (log: LogEntry) => void) {
  if (!logListeners.has(runId)) logListeners.set(runId, new Set());
  logListeners.get(runId)!.add(onLog);
  getRunLogs(runId).forEach(onLog);
  return () => logListeners.get(runId)?.delete(onLog);
}
