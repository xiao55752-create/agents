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
      detail: '保存配置后，在任务页新建 Issue 任务，再根据审计轨迹回到此处迭代 Prompt 与 Skill。',
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
      detail: '在 Prompt 强调「测试不过不开 PR」；确认已挂载 test-run Skill。Issue 含「测试失败」为演示场景。',
    });
  }

  if (stats.rejectRate >= 25) {
    tips.push({
      id: 'high-reject',
      severity: 'warn',
      title: `打回率 ${stats.rejectRate}% 偏高`,
      detail: '检查 Issue 验收标准是否写清；收紧 Skill 挂载范围，避免改动过大。',
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
          ? `常见修改意见：${samples.join('、')}。可在 Prompt 中预先覆盖这些点。`
          : '查看任务页审计中的 revision_requested 事件，把高频意见写进 Prompt。',
    });
  } else if (stats.revisionNotes.length > 0) {
    const samples = topRevisionNotes(stats.revisionNotes, 1);
    tips.push({
      id: 'revision-sample',
      severity: 'info',
      title: '近期验收修改意见',
      detail: `参考：${samples.join('、')}，考虑写入 System Prompt 默认约束。`,
    });
  }

  if (stats.intercepts > 0) {
    tips.push({
      id: 'tool-intercept',
      severity: 'action',
      title: `越权 Tool 拦截 ${stats.intercepts} 次`,
      detail: 'Spec 中存在未挂载 Skill 的 Tool，已在运行时拦截。请只勾选必要 Skill，依赖白名单推导。',
    });
  }

  if (stats.issueToPrRate < 50 && agentRuns.length >= 2) {
    tips.push({
      id: 'low-pr',
      severity: 'warn',
      title: `Issue→PR 仅 ${stats.issueToPrRate}%`,
      detail: '确认已挂载 github-pr Skill（含 open_draft_pr）；检查 Gate 前测试与预算是否阻断。',
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
          : '接近预算上限，可降低 maxTokens 或收紧 Skill 减少 Token 消耗。',
    });
  }

  if (avgTokens > 12_000) {
    tips.push({
      id: 'high-tokens',
      severity: 'info',
      title: `平均 Token ${Math.round(avgTokens).toLocaleString()} 偏高`,
      detail: '缩短 System Prompt、减少挂载 Skill，或降低单次 maxTokens 上限。',
    });
  }

  if (mountedSkillCount > 4) {
    tips.push({
      id: 'many-skills',
      severity: 'info',
      title: `已挂载 ${mountedSkillCount} 个 Skill`,
      detail: '遵循最小授权：只保留完成 Issue 必需的 Skill，降低越权与成本风险。',
    });
  }

  if (tips.length === 0 || (tips.length === 1 && tips[0]!.id === 'revision-sample')) {
    tips.unshift({
      id: 'healthy',
      severity: 'ok',
      title: '指标健康',
      detail: '打回/修改率正常，可继续用当前 Prompt 与 Skill 配置，定期查看架构页全局度量。',
    });
  }

  return tips;
}
