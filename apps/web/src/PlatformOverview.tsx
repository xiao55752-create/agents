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
            <span className="platform-stat-label">Issue→PR</span>
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
            <span className="platform-stat-label">Audit 覆盖</span>
          </div>
          <div className="platform-stat">
            <span className="platform-stat-val">{formatMetricUsd(metrics.avgCostUsd)}</span>
            <span className="platform-stat-label">均任务成本</span>
          </div>
        </div>
      )}

      <h3 className="platform-overview-title">核心能力</h3>
      <div className="platform-capabilities">
        {CORE_CAPABILITIES.map((cap) => (
          <button
            key={cap.id}
            type="button"
            className="cap-card"
            onClick={() => cap.page && onNavigate?.(cap.page)}
            disabled={!onNavigate || !cap.page}
          >
            <strong>{cap.title}</strong>
            <p>{cap.desc}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
