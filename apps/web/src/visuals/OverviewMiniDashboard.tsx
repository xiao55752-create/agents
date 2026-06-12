import type { Page } from '../architecture/types';
import type { PlatformMetrics, Run } from '../types';
import { BudgetRing } from './BudgetRing';
import { SparklineChart } from './SparklineChart';
import { buildTokenTrendSeries } from './tokenCharts';

interface OverviewMiniDashboardProps {
  metrics: PlatformMetrics | null;
  pendingApprovalCount: number;
  agentCount: number;
  runs: Run[];
  onNavigate: (page: Page) => void;
  onOpenPendingTasks?: () => void;
  highlightPage?: Page;
}

function toneFromPercent(percent: number, warnAt = 80): 'ok' | 'warn' | 'danger' {
  if (percent >= 100) return 'danger';
  if (percent >= warnAt) return 'warn';
  return 'ok';
}

function dashActionClass(highlightPage: Page | undefined, target: Page, extra = ''): string {
  const active = highlightPage === target ? ' is-active' : '';
  return `overview-dashboard-action${active}${extra ? ` ${extra}` : ''}`;
}

export function OverviewMiniDashboard({
  metrics,
  pendingApprovalCount,
  agentCount,
  runs,
  onNavigate,
  onOpenPendingTasks,
  highlightPage,
}: OverviewMiniDashboardProps) {
  const totalRuns = metrics?.totalRuns ?? runs.length;
  const completedRuns = metrics?.completedRuns ?? runs.filter((run) => run.status === 'completed').length;
  const issueToPrRate = metrics?.issueToPrRate ?? 0;
  const totalTokens = metrics?.totalTokens ?? runs.reduce((sum, run) => sum + run.tokensUsed, 0);
  const completionRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;
  const pendingRate = totalRuns > 0 ? Math.round((pendingApprovalCount / totalRuns) * 100) : 0;
  const trend = buildTokenTrendSeries(runs);

  return (
    <section className="overview-dashboard" data-tour="overview-dashboard" aria-label="今日迷你仪表盘">
      <div className="overview-dashboard-rings">
        <button
          type="button"
          className={`overview-dashboard-ring ${dashActionClass(highlightPage, 'tasks')}`}
          onClick={() => onNavigate('tasks')}
        >
          <BudgetRing percent={completionRate} tone={toneFromPercent(completionRate, 100)} size={68} label={`任务完成率 ${completionRate}%`} />
          <strong>{completionRate}%</strong>
          <span>任务完成率 · 工作台</span>
        </button>
        <button
          type="button"
          className={`overview-dashboard-ring ${dashActionClass(highlightPage, 'tasks', pendingApprovalCount > 0 ? 'is-warn' : '')}`}
          onClick={() => (onOpenPendingTasks ? onOpenPendingTasks() : onNavigate('tasks'))}
        >
          <BudgetRing
            percent={pendingRate}
            tone={pendingApprovalCount > 0 ? 'warn' : 'ok'}
            size={68}
            label={`待验收占比 ${pendingRate}%`}
          />
          <strong>{pendingApprovalCount}</strong>
          <span>待验收 · 去处理</span>
        </button>
        <button
          type="button"
          className={`overview-dashboard-ring ${dashActionClass(highlightPage, 'architecture')}`}
          onClick={() => onNavigate('architecture')}
        >
          <BudgetRing percent={issueToPrRate} tone={toneFromPercent(issueToPrRate, 100)} size={68} label={`方案生成率 ${issueToPrRate}%`} />
          <strong>{issueToPrRate}%</strong>
          <span>方案生成率 · 度量</span>
        </button>
      </div>

      <div className="overview-dashboard-main">
        <button
          type="button"
          className={`overview-dashboard-trend ${dashActionClass(highlightPage, 'tokens')}`}
          onClick={() => onNavigate('tokens')}
        >
          <span className="overview-dashboard-kicker">Token 走势 · 用量监控</span>
          <SparklineChart points={trend.points} labels={trend.labels} emptyLabel="运行任务后显示近 7 日消耗趋势" />
        </button>
        <div className="overview-dashboard-pills">
          <button type="button" className={dashActionClass(highlightPage, 'tasks', 'overview-dashboard-pill')} onClick={() => onNavigate('tasks')}>
            <em>{totalRuns}</em> 总任务
          </button>
          <button type="button" className={dashActionClass(highlightPage, 'agents', 'overview-dashboard-pill')} onClick={() => onNavigate('agents')}>
            <em>{agentCount}</em> 智能体
          </button>
          <button type="button" className={dashActionClass(highlightPage, 'tokens', 'overview-dashboard-pill')} onClick={() => onNavigate('tokens')}>
            <em>{totalTokens.toLocaleString()}</em> tokens
          </button>
          <button
            type="button"
            className={dashActionClass(highlightPage, 'tasks', `overview-dashboard-pill${pendingApprovalCount > 0 ? ' is-warn' : ''}`)}
            onClick={() => (onOpenPendingTasks ? onOpenPendingTasks() : onNavigate('tasks'))}
          >
            <em>{pendingApprovalCount}</em> 待办
          </button>
        </div>
      </div>
    </section>
  );
}
