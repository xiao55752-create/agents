import { getAgentBudgetStatus, getAgentMonthlySpend } from './api';
import { friendlyTaskTitle } from './friendly';
import type { Page } from './architecture/types';
import type { Agent, Run } from './types';

export type NotificationKind = 'approval' | 'failed' | 'budget_warn' | 'budget_exceeded';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  time: string;
  page: Page;
  runId?: string;
  agentId?: string;
  severity: 'info' | 'warn' | 'danger';
}

const READ_KEY = 'agentos_read_notifications';

export function readNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveNotificationIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function computeNotifications(agents: Agent[], runs: Run[]): AppNotification[] {
  const items: AppNotification[] = [];

  for (const run of runs) {
    if (run.status === 'needs_approval') {
      items.push({
        id: `approval:${run.id}`,
        kind: 'approval',
        title: '修改方案待验收',
        detail: friendlyTaskTitle(run),
        time: run.updatedAt,
        page: 'tasks',
        runId: run.id,
        severity: 'warn',
      });
    }

    if (run.status === 'failed') {
      items.push({
        id: `failed:${run.id}`,
        kind: 'failed',
        title: '任务执行失败',
        detail: run.errorMessage ?? friendlyTaskTitle(run),
        time: run.updatedAt,
        page: 'tasks',
        runId: run.id,
        severity: 'danger',
      });
    }
  }

  for (const agent of agents) {
    const status = getAgentBudgetStatus(agent.id);
    const budget = agent.spec.limits.monthlyBudgetTokens ?? 500_000;
    const spend = getAgentMonthlySpend(agent.id);
    const pct = budget > 0 ? Math.round((spend / budget) * 100) : 0;

    if (status === 'exceeded') {
      items.push({
        id: `budget-exceeded:${agent.id}`,
        kind: 'budget_exceeded',
        title: '智能体预算已用尽',
        detail: `${agent.name} 本月已用 ${spend.toLocaleString()} / ${budget.toLocaleString()} tokens，无法新建任务`,
        time: new Date().toISOString(),
        page: 'tokens',
        agentId: agent.id,
        severity: 'danger',
      });
    } else if (status === 'warn') {
      items.push({
        id: `budget-warn:${agent.id}`,
        kind: 'budget_warn',
        title: '智能体预算接近上限',
        detail: `${agent.name} 已用 ${pct}%（${spend.toLocaleString()} tokens）`,
        time: new Date().toISOString(),
        page: 'tokens',
        agentId: agent.id,
        severity: 'warn',
      });
    }
  }

  const severityRank = { danger: 0, warn: 1, info: 2 };
  return items.sort((a, b) => {
    const rank = severityRank[a.severity] - severityRank[b.severity];
    if (rank !== 0) return rank;
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  });
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
