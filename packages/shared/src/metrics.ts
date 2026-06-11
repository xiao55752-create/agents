/** 本地模式假单价：USD / token（仅用于成本估算展示） */
export const TOKEN_UNIT_PRICE_USD = 0.000002;

export interface PlatformMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  needsApprovalRuns: number;
  activeRuns: number;
  successRate: number;
  approvalRate: number;
  rejectRate: number;
  reviseRate: number;
  issueToPrRate: number;
  auditCoverageRate: number;
  toolInterceptRate: number;
  workflowReuseRate: number;
  avgDurationSec: number;
  avgTokens: number;
  totalTokens: number;
  avgCostUsd: number;
  totalCostUsd: number;
}

export function formatMetricUsd(amount: number): string {
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  if (amount >= 0.01) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(4)}`;
}

interface RunLike {
  id?: string;
  agentId?: string;
  workflow?: string;
  status: string;
  tokensUsed: number;
  createdAt: string;
  updatedAt: string;
}

interface AuditLike {
  type: string;
}

export function computePlatformMetrics(
  runs: RunLike[],
  auditsByRun?: Record<string, AuditLike[]>,
): PlatformMetrics {
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === 'completed').length;
  const failedRuns = runs.filter((r) => r.status === 'failed').length;
  const cancelledRuns = runs.filter((r) => r.status === 'cancelled').length;
  const needsApprovalRuns = runs.filter((r) => r.status === 'needs_approval').length;
  const activeRuns = runs.filter((r) =>
    ['pending', 'queued', 'provisioning', 'running', 'pr_opened'].includes(r.status),
  ).length;

  const terminal = runs.filter((r) => ['completed', 'failed', 'cancelled'].includes(r.status));
  const durations = terminal.map(
    (r) => Math.max(1, (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 1000),
  );
  const avgDurationSec =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  const withTokens = runs.filter((r) => r.tokensUsed > 0);
  const totalTokens = withTokens.reduce((sum, r) => sum + r.tokensUsed, 0);
  const avgTokens = withTokens.length > 0 ? Math.round(totalTokens / withTokens.length) : 0;

  const finished = completedRuns + failedRuns;
  const successRate = finished > 0 ? Math.round((completedRuns / finished) * 100) : 0;
  const approvalCandidates = completedRuns + needsApprovalRuns;
  const approvalRate =
    approvalCandidates > 0 ? Math.round((completedRuns / approvalCandidates) * 100) : 0;

  let prOpenedRuns = 0;
  let gateApproves = 0;
  let gateRejects = 0;
  let gateRevises = 0;

  if (auditsByRun) {
    for (const run of runs) {
      const id = run.id;
      const events = id ? auditsByRun[id] ?? [] : [];
      if (events.some((e) => e.type === 'pr.opened')) prOpenedRuns += 1;
      gateApproves += events.filter((e) => e.type === 'run.approved').length;
      gateRejects += events.filter((e) => e.type === 'run.reject_retry').length;
      gateRevises += events.filter((e) => e.type === 'run.revision_requested').length;
    }
  } else {
    prOpenedRuns = runs.filter((r) => r.status === 'pr_opened' || r.status === 'needs_approval' || r.status === 'completed').length;
  }

  const issueToPrRate = totalRuns > 0 ? Math.round((prOpenedRuns / totalRuns) * 100) : 0;
  const gateDecisions = gateApproves + gateRejects + gateRevises;
  const rejectRate = gateDecisions > 0 ? Math.round((gateRejects / gateDecisions) * 100) : 0;
  const reviseRate = gateDecisions > 0 ? Math.round((gateRevises / gateDecisions) * 100) : 0;

  let auditedRuns = 0;
  let interceptRuns = 0;
  if (auditsByRun) {
    for (const run of runs) {
      const id = run.id;
      const events = id ? auditsByRun[id] ?? [] : [];
      if (events.length > 0) auditedRuns += 1;
      if (events.some((e) => e.type === 'tool.intercepted')) interceptRuns += 1;
    }
  } else {
    auditedRuns = totalRuns;
  }

  const auditCoverageRate = totalRuns > 0 ? Math.round((auditedRuns / totalRuns) * 100) : 0;
  const toolInterceptRate = totalRuns > 0 ? Math.round((interceptRuns / totalRuns) * 100) : 0;

  const sorted = [...runs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const seenAgentWorkflow = new Set<string>();
  let reuseRuns = 0;
  for (const run of sorted) {
    const wf = run.workflow ?? 'issue-to-pr';
    const agentKey = `${run.agentId ?? 'default'}:${wf}`;
    if (seenAgentWorkflow.has(agentKey)) reuseRuns += 1;
    else seenAgentWorkflow.add(agentKey);
  }
  const workflowReuseRate = totalRuns > 0 ? Math.round((reuseRuns / totalRuns) * 100) : 0;

  const totalCostUsd = Math.round(totalTokens * TOKEN_UNIT_PRICE_USD * 100) / 100;
  const costRuns = withTokens.length;
  const avgCostUsd =
    costRuns > 0 ? Math.round((totalCostUsd / costRuns) * 100) / 100 : 0;

  return {
    totalRuns,
    completedRuns,
    failedRuns,
    cancelledRuns,
    needsApprovalRuns,
    activeRuns,
    successRate,
    approvalRate,
    rejectRate,
    reviseRate,
    issueToPrRate,
    auditCoverageRate,
    toolInterceptRate,
    workflowReuseRate,
    avgDurationSec,
    avgTokens,
    totalTokens,
    avgCostUsd,
    totalCostUsd,
  };
}
