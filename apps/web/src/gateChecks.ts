import type { Agent, Run } from './types';

export interface GateCheckItem {
  id: 'tests' | 'diff' | 'budget' | 'pr';
  label: string;
  ok: boolean;
  detail: string;
}

export interface GateCheckSnapshot {
  items: GateCheckItem[];
  passed: boolean;
  failures: string[];
}

/** Issue 标题/正文中含此标记时，模拟测试失败（可复现演示） */
export const TEST_FAIL_MARKERS = ['测试失败', 'fail test', '[fail-tests]'];

export function shouldSimulateTestFailure(run: Run): boolean {
  const text = `${run.input.issueTitle ?? ''}\n${run.input.issueBody ?? ''}`.toLowerCase();
  return TEST_FAIL_MARKERS.some((m) => text.includes(m.toLowerCase()));
}

export function agentHasTestCapability(tools: string[]): boolean {
  return tools.includes('run_tests') || tools.includes('shell');
}

export function buildGateCheckSnapshot(
  run: Run,
  agent: Agent | undefined,
  tools: string[],
  options: {
    testsPassed: boolean;
    testsRan: boolean;
    hasDiff: boolean;
    budgetOk: boolean;
    prReady: boolean;
  },
): GateCheckSnapshot {
  const items: GateCheckItem[] = [];

  if (!options.testsRan) {
    items.push({
      id: 'tests',
      label: '自动化测试',
      ok: false,
      detail: '智能体未挂载测试 Skill（run_tests / shell）',
    });
  } else if (options.testsPassed) {
    items.push({
      id: 'tests',
      label: '自动化测试',
      ok: true,
      detail: '全部通过',
    });
  } else {
    items.push({
      id: 'tests',
      label: '自动化测试',
      ok: false,
      detail: '未通过，已阻断进入 Gate',
    });
  }

  items.push({
    id: 'diff',
    label: '代码变更',
    ok: options.hasDiff,
    detail: options.hasDiff ? `已生成 ${run.output?.changedFiles?.length ?? 0} 个文件变更` : '无有效 diff',
  });

  const budget = agent?.spec.limits.monthlyBudgetTokens ?? 500_000;
  items.push({
    id: 'budget',
    label: 'Token 预算',
    ok: options.budgetOk,
    detail: options.budgetOk
      ? `本月预算充足（上限 ${budget.toLocaleString()}）`
      : '本月预算已用尽或不足',
  });

  if (tools.includes('open_draft_pr')) {
    items.push({
      id: 'pr',
      label: 'Draft PR',
      ok: options.prReady,
      detail: options.prReady ? '草稿已生成，可进入验收' : 'PR 未就绪',
    });
  }

  const failures = items.filter((i) => !i.ok).map((i) => `${i.label}：${i.detail}`);
  return {
    items,
    passed: failures.length === 0,
    failures,
  };
}

export function gateCheckSummary(snapshot: GateCheckSnapshot | undefined): string {
  if (!snapshot) return '';
  if (snapshot.passed) return '全部检查通过，可进入 Human Gate';
  return snapshot.failures.join('；');
}
