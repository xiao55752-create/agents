import { IS_FRONTEND_DEMO } from './demo/index.js';
import * as demo from './demo/store.js';
import type {
  Agent,
  AgentSpec,
  AuditEvent,
  IntegrationsStatus,
  LogEntry,
  PlatformMetrics,
  Run,
} from './types.js';

export type {
  Agent,
  AgentSpec,
  AuditEvent,
  IntegrationsStatus,
  LogEntry,
  PlatformMetrics,
  Run,
  RunStatus,
} from './types.js';

const API = '';

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function fetchIntegrations(): Promise<IntegrationsStatus> {
  if (IS_FRONTEND_DEMO) return demo.demoIntegrations();
  const res = await fetch(`${API}/api/config`);
  const data = await res.json();
  return data.integrations;
}

export async function fetchSkills() {
  if (IS_FRONTEND_DEMO) return demo.demoFetchSkills();
  const res = await fetch(`${API}/api/skills`);
  const data = await res.json();
  return data.skills as import('@agentos/shared').SkillSpec[];
}

export async function fetchMetrics(): Promise<PlatformMetrics> {
  if (IS_FRONTEND_DEMO) return demo.demoFetchMetrics();
  const res = await fetch(`${API}/api/metrics`);
  const data = await res.json();
  return data.metrics;
}

export async function fetchAgentIterationInsights(agentId: string) {
  if (IS_FRONTEND_DEMO) return demo.demoAgentIterationInsights(agentId);
  const res = await fetch(`${API}/api/agents/${agentId}/insights`);
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.insights as import('./iterationInsights').IterationInsight[];
}

export async function fetchAgents(): Promise<Agent[]> {
  if (IS_FRONTEND_DEMO) return demo.demoFetchAgents();
  const res = await fetch(`${API}/api/agents`);
  const data = await res.json();
  return data.agents;
}

export async function fetchAgent(id: string): Promise<Agent> {
  if (IS_FRONTEND_DEMO) return demo.demoFetchAgent(id);
  const res = await fetch(`${API}/api/agents/${id}`);
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.agent;
}

export async function createAgent(name: string, spec: AgentSpec): Promise<Agent> {
  if (IS_FRONTEND_DEMO) return demo.demoCreateAgent(name, spec);
  const res = await fetch(`${API}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, spec }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.agent;
}

export async function updateAgent(id: string, name: string, spec: AgentSpec): Promise<Agent> {
  if (IS_FRONTEND_DEMO) return demo.demoUpdateAgent(id, name, spec);
  const res = await fetch(`${API}/api/agents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, spec }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.agent;
}

export async function fetchRuns(status?: string): Promise<Run[]> {
  if (IS_FRONTEND_DEMO) return demo.demoFetchRuns(status);
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API}/api/runs${qs}`);
  const data = await res.json();
  return data.runs;
}

export async function fetchRun(id: string): Promise<Run> {
  if (IS_FRONTEND_DEMO) return demo.demoFetchRun(id);
  const res = await fetch(`${API}/api/runs/${id}`);
  const data = await res.json();
  return data.run;
}

export async function fetchAudit(runId: string): Promise<AuditEvent[]> {
  if (IS_FRONTEND_DEMO) return demo.demoFetchAudit(runId);
  const res = await fetch(`${API}/api/runs/${runId}/audit`);
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.events;
}

export async function createRun(body: {
  repo: string;
  issueNumber?: number;
  issueTitle?: string;
  issueBody?: string;
  acceptanceCriteria?: string;
  agentId?: string;
}): Promise<Run> {
  if (IS_FRONTEND_DEMO) return demo.demoCreateRun(body);
  const res = await fetch(`${API}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow: 'issue-to-pr',
      agentId: body.agentId,
      input: {
        repo: body.repo,
        issueNumber: body.issueNumber,
        issueTitle: body.issueTitle,
        issueBody: body.issueBody,
        acceptanceCriteria: body.acceptanceCriteria,
      },
    }),
  });
  const data = await res.json();
  return data.run;
}

export async function approveRun(id: string) {
  if (IS_FRONTEND_DEMO) {
    demo.demoApproveRun(id);
    return;
  }
  await fetch(`${API}/api/runs/${id}/approve`, { method: 'POST' });
}

export async function rejectRun(id: string, reason?: string) {
  if (IS_FRONTEND_DEMO) {
    demo.demoRejectRun(id, reason);
    return;
  }
  await fetch(`${API}/api/runs/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function reviseRun(id: string, notes: string) {
  if (IS_FRONTEND_DEMO) {
    demo.demoReviseRun(id, notes);
    return;
  }
  await fetch(`${API}/api/runs/${id}/revise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

export function getAgentMonthlySpend(agentId: string): number {
  if (IS_FRONTEND_DEMO) return demo.demoAgentMonthlySpend(agentId);
  return 0;
}

export function isAgentBudgetExceeded(agentId: string): boolean {
  if (IS_FRONTEND_DEMO) return demo.demoIsAgentBudgetExceeded(agentId);
  return false;
}

export type AgentBudgetStatus = 'ok' | 'warn' | 'exceeded';

export function getAgentBudgetStatus(agentId: string): AgentBudgetStatus {
  if (IS_FRONTEND_DEMO) return demo.demoAgentBudgetStatus(agentId);
  return 'ok';
}

export async function cancelRun(id: string) {
  if (IS_FRONTEND_DEMO) {
    demo.demoCancelRun(id);
    return;
  }
  await fetch(`${API}/api/runs/${id}/cancel`, { method: 'POST' });
}

export async function retryRun(id: string) {
  if (IS_FRONTEND_DEMO) {
    demo.demoRetryRun(id);
    return;
  }
  await fetch(`${API}/api/runs/${id}/retry`, { method: 'POST' });
}

export async function deleteRun(id: string) {
  if (IS_FRONTEND_DEMO) {
    demo.demoDeleteRun(id);
    return;
  }
  await fetch(`${API}/api/runs/${id}`, { method: 'DELETE' });
}

export async function duplicateAgent(id: string): Promise<Agent> {
  if (IS_FRONTEND_DEMO) return demo.demoDuplicateAgent(id);
  throw new Error('仅 Demo 模式支持复制智能体');
}

export async function deleteAgent(id: string) {
  if (IS_FRONTEND_DEMO) {
    demo.demoDeleteAgent(id);
    return;
  }
  await fetch(`${API}/api/agents/${id}`, { method: 'DELETE' });
}

export async function resetDemoData() {
  if (IS_FRONTEND_DEMO) {
    demo.demoResetAll();
    return;
  }
  throw new Error('仅 Demo 模式支持重置');
}

export async function exportDemoData(): Promise<string> {
  if (IS_FRONTEND_DEMO) return demo.demoExportState();
  throw new Error('仅本地模式支持导出');
}

export async function importDemoData(raw: string) {
  if (IS_FRONTEND_DEMO) {
    demo.demoImportState(raw);
    return;
  }
  throw new Error('仅本地模式支持导入');
}

export function subscribeLogs(runId: string, onLog: (log: LogEntry) => void) {
  if (IS_FRONTEND_DEMO) return demo.demoSubscribeLogs(runId, onLog);
  const es = new EventSource(`${API}/api/runs/${runId}/logs`);
  es.addEventListener('log', (ev) => {
    onLog(JSON.parse(ev.data) as LogEntry);
  });
  return () => es.close();
}

export { IS_FRONTEND_DEMO };
