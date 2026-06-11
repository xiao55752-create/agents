import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_AGENT, id, validateAgentSpec, type AgentSpec, type RunInput, type RunRecord, type RunStatus } from '@agentos/shared';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, 'store.json');

interface Store {
  agents: Array<{ id: string; name: string; spec: AgentSpec; createdAt: string; updatedAt: string }>;
  runs: RunRecord[];
  logs: Array<{
    id: number;
    runId: string;
    level: string;
    message: string;
    meta?: Record<string, unknown>;
    createdAt: string;
  }>;
  audit: Array<{
    id: number;
    runId: string;
    eventType: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  nextLogId: number;
  nextAuditId: number;
  runVersions: Record<string, number>;
}

function createInitialStore(): Store {
  const agentId = id('agt');
  const now = new Date().toISOString();
  return {
    agents: [
      {
        id: agentId,
        name: DEFAULT_AGENT.name,
        spec: DEFAULT_AGENT,
        createdAt: now,
        updatedAt: now,
      },
    ],
    runs: [],
    logs: [],
    audit: [],
    nextLogId: 1,
    nextAuditId: 1,
    runVersions: {},
  };
}

function loadStore(): Store {
  if (!fs.existsSync(dbPath)) {
    return createInitialStore();
  }
  return normalizeStore(JSON.parse(fs.readFileSync(dbPath, 'utf-8')) as Store);
}

function normalizeStore(raw: Store): Store {
  for (const agent of raw.agents) {
    if (!agent.updatedAt) agent.updatedAt = agent.createdAt;
    if (!agent.spec.skills?.length) {
      const validated = validateAgentSpec({
        name: agent.spec.name,
        model: agent.spec.model,
        systemPrompt: agent.spec.systemPrompt,
        tools: agent.spec.tools,
        limits: agent.spec.limits,
      });
      if (validated.ok) agent.spec = validated.spec;
    }
  }
  return raw;
}

let store = loadStore();

function saveStore() {
  fs.writeFileSync(dbPath, JSON.stringify(store, null, 2));
}

if (!fs.existsSync(dbPath)) {
  saveStore();
}

export function listAgents() {
  return store.agents;
}

export function getAgent(agentId: string) {
  return store.agents.find((a) => a.id === agentId) ?? null;
}

export function createAgent(name: string, spec: AgentSpec) {
  const now = new Date().toISOString();
  const agent = {
    id: id('agt'),
    name,
    spec: { ...spec, name },
    createdAt: now,
    updatedAt: now,
  };
  store.agents.push(agent);
  saveStore();
  return agent;
}

export function updateAgent(
  agentId: string,
  patch: { name?: string; spec?: AgentSpec },
) {
  const idx = store.agents.findIndex((a) => a.id === agentId);
  if (idx === -1) return null;

  const current = store.agents[idx]!;
  const name = patch.name?.trim() ?? current.name;
  const spec = patch.spec ? { ...patch.spec, name: patch.spec.name || name } : current.spec;
  const updated = {
    ...current,
    name,
    spec,
    updatedAt: new Date().toISOString(),
  };
  store.agents[idx] = updated;
  saveStore();
  return updated;
}

export function createRun(params: {
  agentId: string;
  workflow: string;
  input: RunInput;
}): RunRecord {
  const runId = id('run');
  const now = new Date().toISOString();
  const run: RunRecord = {
    id: runId,
    agentId: params.agentId,
    workflow: params.workflow,
    status: 'pending',
    input: params.input,
    controlIntent: null,
    reconcileBackoffUntil: null,
    reconcileAttempts: 0,
    tokensUsed: 0,
    createdAt: now,
    updatedAt: now,
  };
  store.runs.unshift(run);
  store.runVersions[runId] = 0;
  saveStore();
  appendLog(runId, 'info', `Run created for ${params.input.repo}`, { workflow: params.workflow });
  appendAudit(runId, 'run.created', { input: params.input });
  return run;
}

export function listRuns(status?: string): RunRecord[] {
  if (status) return store.runs.filter((r) => r.status === status);
  return [...store.runs];
}

export function getRun(runId: string): RunRecord | null {
  return store.runs.find((r) => r.id === runId) ?? null;
}

export function getRunVersion(runId: string): number {
  return store.runVersions[runId] ?? 0;
}

export function updateRunCas(
  runId: string,
  expectedVersion: number,
  patch: Partial<{
    status: RunStatus;
    output: RunRecord['output'];
    controlIntent: RunRecord['controlIntent'];
    reconcileBackoffUntil: string | null;
    reconcileAttempts: number;
    errorMessage: string | null;
    tokensUsed: number;
  }>,
): boolean {
  const idx = store.runs.findIndex((r) => r.id === runId);
  if (idx === -1) return false;
  if ((store.runVersions[runId] ?? 0) !== expectedVersion) return false;

  const run = store.runs[idx]!;
  const updated: RunRecord = {
    ...run,
    ...patch,
    status: patch.status ?? run.status,
    output: patch.output !== undefined ? patch.output : run.output,
    controlIntent: patch.controlIntent !== undefined ? patch.controlIntent : run.controlIntent,
    reconcileBackoffUntil:
      patch.reconcileBackoffUntil !== undefined ? patch.reconcileBackoffUntil : run.reconcileBackoffUntil,
    reconcileAttempts: patch.reconcileAttempts ?? run.reconcileAttempts,
    errorMessage: patch.errorMessage !== undefined ? patch.errorMessage ?? undefined : run.errorMessage,
    tokensUsed: patch.tokensUsed ?? run.tokensUsed,
    updatedAt: new Date().toISOString(),
  };
  store.runs[idx] = updated;
  store.runVersions[runId] = expectedVersion + 1;
  saveStore();
  return true;
}

export function setControlIntent(runId: string, intent: RunRecord['controlIntent']) {
  updateRunCas(runId, getRunVersion(runId), { controlIntent: intent });
}

export function appendLog(
  runId: string,
  level: 'info' | 'warn' | 'error' | 'step',
  message: string,
  meta?: Record<string, unknown>,
) {
  store.logs.push({
    id: store.nextLogId++,
    runId,
    level,
    message,
    meta,
    createdAt: new Date().toISOString(),
  });
  saveStore();
}

export function getLogs(runId: string, afterId = 0) {
  return store.logs.filter((l) => l.runId === runId && l.id > afterId);
}

export function appendAudit(runId: string, eventType: string, payload: Record<string, unknown>) {
  store.audit.push({
    id: store.nextAuditId++,
    runId,
    eventType,
    payload,
    createdAt: new Date().toISOString(),
  });
  saveStore();
}

export function getAudit(runId: string) {
  return store.audit.filter((a) => a.runId === runId);
}

export function listNonTerminalRuns(): RunRecord[] {
  return store.runs.filter((r) => !['completed', 'failed', 'cancelled'].includes(r.status));
}

export function countActiveExecutions(): number {
  return store.runs.filter((r) => ['provisioning', 'running', 'pr_opened'].includes(r.status)).length;
}

export const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_RUNS ?? 2);
