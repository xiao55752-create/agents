import { formatMetricUsd } from '@agentos/shared';
import type { PlatformMetrics } from './types';
import type { Page } from './architecture/types';
import { CORE_CAPABILITIES, PLATFORM_PAGES } from './platformFeatures';

interface PlatformOverviewProps {
  variant?: 'welcome' | 'compact' | 'pages';
  metrics?: PlatformMetrics | null;
  pendingApprovalCount?: number;
  onNavigate?: (page: Page) => void;
}

const HOME_CAPABILITIES = [
  {
    id: 'review',
    num: '01',
    icon: '✓',
    title: '结果先验收，再完成',
    desc: '智能体生成修改方案后不会直接结束，必须由你确认通过、要求修改或打回重做。',
    page: 'tasks' as Page,
    action: '去工作台验收',
  },
  {
    id: 'permission',
    num: '02',
    icon: '⬡',
    title: '权限按能力包控制',
    desc: '每个智能体只能使用已勾选的能力包，避免做超出范围的操作。',
    page: 'agents' as Page,
    action: '配置智能体',
  },
  {
    id: 'trace',
    num: '03',
    icon: '◎',
    title: '过程有记录，可复盘',
    desc: '执行进度、验收决定和状态变化都会留下记录，方便团队追踪和优化。',
    page: 'tasks' as Page,
    action: '查看操作记录',
  },
];

export function PlatformOverview({
  variant = 'welcome',
  metrics,
  pendingApprovalCount = 0,
  onNavigate,
}: PlatformOverviewProps) {
  if (variant === 'compact') {
    return (
      <div className="platform-capabilities compact">
        {CORE_CAPABILITIES.map((cap) => (
          <span key={cap.id} className="cap-chip" title={cap.desc}>
            {cap.title}
          </span>
        ))}
      </div>
    );
  }

  if (variant === 'pages') {
    return (
      <div className="platform-pages-grid">
        {PLATFORM_PAGES.map((p) => (
          <article key={p.id} className="platform-page-card">
            <div className="platform-page-head">
              <strong>{p.title}</strong>
              <span>{p.subtitle}</span>
            </div>
            <ul>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {onNavigate && (
              <button type="button" className="arch-link-btn" onClick={() => onNavigate(p.id)}>
                打开{p.title}页 →
              </button>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <section className="platform-overview">
      {metrics && metrics.totalRuns > 0 && (
        <div className="platform-stats">
          <div className="platform-stat">
            <span className="platform-stat-val">{metrics.totalRuns}</span>
            <span className="platform-stat-label">总任务</span>
          </div>
          <div className="platform-stat">
            <span className="platform-stat-val">{metrics.completedRuns}</span>
            <span className="platform-stat-label">已完成</span>
          </div>
          {pendingApprovalCount > 0 && (
            <div className="platform-stat platform-stat-warn">
              <span className="platform-stat-val">{pendingApprovalCount}</span>
              <span className="platform-stat-label">待验收</span>
            </div>
          )}
          <div className="platform-stat">
            <span className="platform-stat-val">{metrics.issueToPrRate}%</span>
            <span className="platform-stat-label">方案生成率</span>
          </div>
          <div className="platform-stat">
            <span className="platform-stat-val">{metrics.successRate}%</span>
            <span className="platform-stat-label">成功率</span>
          </div>
          <div className="platform-stat">
            <span className="platform-stat-val">{metrics.rejectRate}%</span>
            <span className="platform-stat-label">打回率</span>
          </div>
          <div className="platform-stat">
            <span className="platform-stat-val">{metrics.auditCoverageRate}%</span>
            <span className="platform-stat-label">记录覆盖</span>
          </div>
          <div className="platform-stat">
            <span className="platform-stat-val">{formatMetricUsd(metrics.avgCostUsd)}</span>
            <span className="platform-stat-label">平均成本</span>
          </div>
        </div>
      )}

      <div className="platform-overview-head">
        <span className="section-kicker">为什么可以放心交给智能体</span>
        <h3>关键环节都有人确认、有权限边界、有记录</h3>
      </div>
      <div className="platform-capabilities platform-capabilities-home">
        {HOME_CAPABILITIES.map((cap) => (
          <button
            key={cap.id}
            type="button"
            className="cap-card"
            onClick={() => cap.page && onNavigate?.(cap.page)}
            disabled={!onNavigate || !cap.page}
          >
            <div className="cap-card-top">
              <span className="cap-card-icon" aria-hidden>
                {cap.icon}
              </span>
              <span className="cap-card-num">{cap.num}</span>
            </div>
            <strong>{cap.title}</strong>
            <p>{cap.desc}</p>
            {onNavigate && cap.page && <span className="cap-card-action">{cap.action} →</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
