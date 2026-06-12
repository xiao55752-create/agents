import type { AuditEvent, Run } from './types';

export type InsightSeverity = 'info' | 'warn' | 'action' | 'ok';

export interface IterationInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
}

function gateStatsForAgent(runs: Run[], auditsByRun: Record<string, AuditEvent[]>) {
  let rejects = 0;
  let revises = 0;
  let approves = 0;
  let testFails = 0;
  let intercepts = 0;
  let prOpened = 0;
  const revisionNotes: string[] = [];

  for (const run of runs) {
    const events = auditsByRun[run.id] ?? [];
    if (events.some((e) => e.type === 'pr.opened')) prOpened += 1;
    if (events.some((e) => e.type === 'tests.failed')) testFails += 1;
    if (events.some((e) => e.type === 'tool.intercepted')) intercepts += 1;
    for (const e of events) {
      if (e.type === 'run.reject_retry') rejects += 1;
      if (e.type === 'run.revision_requested') {
        revises += 1;
        const notes = e.payload?.notes;
        if (typeof notes === 'string' && notes.trim()) revisionNotes.push(notes.trim());
      }
      if (e.type === 'run.approved') approves += 1;
    }
  }

  const gateDecisions = rejects + revises + approves;
  return {
    rejects,
    revises,
    approves,
    gateDecisions,
    rejectRate: gateDecisions > 0 ? Math.round((rejects / gateDecisions) * 100) : 0,
    reviseRate: gateDecisions > 0 ? Math.round((revises / gateDecisions) * 100) : 0,
    testFails,
    intercepts,
    prOpened,
    issueToPrRate: runs.length > 0 ? Math.round((prOpened / runs.length) * 100) : 0,
    revisionNotes,
  };
}

function topRevisionNotes(notes: string[], limit = 2): string[] {
  const counts = new Map<string, number>();
  for (const n of notes) {
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => (count > 1 ? `「${text}」（${count} 次）` : `「${text}」`));
}

export function computeAgentIterationInsights(
  agentRuns: Run[],
  auditsByRun: Record<string, AuditEvent[]>,
  monthlySpend: number,
  monthlyBudget: number,
  mountedSkillCount: number,
): IterationInsight[] {
  const tips: IterationInsight[] = [];

  if (agentRuns.length === 0) {
    tips.push({
      id: 'no-runs',
      severity: 'info',
      title: '尚无任务数据',
      detail: '保存配置后，在工作台新建任务，再根据操作记录回到这里优化行为指令和能力包。',
    });
    return tips;
  }

  const stats = gateStatsForAgent(agentRuns, auditsByRun);
  const budgetPct = monthlyBudget > 0 ? Math.round((monthlySpend / monthlyBudget) * 100) : 0;
  const avgTokens =
    agentRuns.filter((r) => r.tokensUsed > 0).reduce((s, r) => s + r.tokensUsed, 0) /
    Math.max(1, agentRuns.filter((r) => r.tokensUsed > 0).length);

  if (stats.testFails > 0) {
    tips.push({
      id: 'test-fail',
      severity: 'action',
      title: `有 ${stats.testFails} 次测试失败`,
      detail: '在行为指令里强调“测试不过不交付”；确认已挂载测试能力包。任务说明含“测试失败”可演示失败场景。',
    });
  }

  if (stats.rejectRate >= 25) {
    tips.push({
      id: 'high-reject',
      severity: 'warn',
      title: `打回率 ${stats.rejectRate}% 偏高`,
      detail: '检查验收标准是否写清楚；减少不必要的能力包，避免改动范围过大。',
    });
  }

  if (stats.reviseRate >= 25) {
    const samples = topRevisionNotes(stats.revisionNotes);
    tips.push({
      id: 'high-revise',
      severity: 'warn',
      title: `要求修改率 ${stats.reviseRate}% 偏高`,
      detail:
        samples.length > 0
          ? `常见修改意见：${samples.join('、')}。可在行为指令中提前覆盖这些点。`
          : '查看工作台操作记录里的修改意见，把高频要求写进行为指令。',
    });
  } else if (stats.revisionNotes.length > 0) {
    const samples = topRevisionNotes(stats.revisionNotes, 1);
    tips.push({
      id: 'revision-sample',
      severity: 'info',
      title: '近期验收修改意见',
      detail: `参考：${samples.join('、')}，可以写进行为指令，作为默认要求。`,
    });
  }

  if (stats.intercepts > 0) {
    tips.push({
      id: 'tool-intercept',
      severity: 'action',
      title: `越权 Tool 拦截 ${stats.intercepts} 次`,
      detail: '配置里出现了未授权工具，运行时已拦截。请只勾选必要能力包，让系统自动生成工具权限。',
    });
  }

  if (stats.issueToPrRate < 50 && agentRuns.length >= 2) {
    tips.push({
      id: 'low-pr',
      severity: 'warn',
      title: `方案生成率仅 ${stats.issueToPrRate}%`,
      detail: '确认已挂载生成修改方案的能力包；检查验收前测试或预算是否阻断。',
    });
  }

  if (budgetPct >= 80) {
    tips.push({
      id: 'budget',
      severity: budgetPct >= 100 ? 'action' : 'warn',
      title: `本月预算已用 ${budgetPct}%`,
      detail:
        budgetPct >= 100
          ? '预算用尽会拦截新建任务，请提高月度上限或等待下月。'
          : '接近预算上限，可降低单次最大用量或减少能力包，降低消耗。',
    });
  }

  if (avgTokens > 12_000) {
    tips.push({
      id: 'high-tokens',
      severity: 'info',
      title: `平均用量 ${Math.round(avgTokens).toLocaleString()} tokens 偏高`,
      detail: '缩短行为指令、减少能力包，或降低单次最大用量上限。',
    });
  }

  if (mountedSkillCount > 4) {
    tips.push({
      id: 'many-skills',
      severity: 'info',
      title: `已选择 ${mountedSkillCount} 个能力包`,
      detail: '建议只保留完成任务必需的能力包，降低越权和成本风险。',
    });
  }

  if (tips.length === 0 || (tips.length === 1 && tips[0]!.id === 'revision-sample')) {
    tips.unshift({
      id: 'healthy',
      severity: 'ok',
      title: '指标健康',
      detail: '打回和修改率正常，可继续使用当前行为指令与能力包配置，定期查看架构页全局指标。',
    });
  }

  return tips;
}
