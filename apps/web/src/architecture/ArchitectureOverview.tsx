import { PlatformOverview } from '../PlatformOverview';
import { formatMetricUsd } from '@agentos/shared';
import type { PlatformMetrics } from '../types';
import type { Page } from './types';
import {
  ARCH_LAYERS,
  ARCH_PILLARS,
  FACTORY_LOOP,
  IMPL_LABEL,
  MANUFACTURING_BASE_9,
  MANUFACTURING_SCOPE_LABEL,
  METRICS,
  POSITIONING,
  ROADMAP,
  type ImplStatus,
  type LayerStatus,
  type ManufacturingScope,
} from './model';
import { ArchPipelineDiagram } from './ArchPipelineDiagram';

const STATUS_LABEL: Record<LayerStatus, string> = {
  demo: '本地已覆盖',
  planned: '规划中',
  future: '远期',
};

const ROADMAP_LABEL: Record<string, string> = {
  done: '已完成',
  current: '进行中',
  next: '下一步',
  later: '远期',
};

const METRIC_LABELS: Partial<Record<keyof PlatformMetrics, string>> = {
  successRate: '成功率',
  approvalRate: '审批通过率',
  rejectRate: '打回率',
  reviseRate: '要求修改率',
  issueToPrRate: '方案生成率',
  completedRuns: '已完成任务',
  avgDurationSec: '平均耗时(秒)',
  avgTokens: '平均用量',
  activeRuns: '进行中',
  totalRuns: '总任务数',
  auditCoverageRate: '记录覆盖率',
  toolInterceptRate: '越权拦截率',
  workflowReuseRate: '流程复用率',
  avgCostUsd: '单任务成本',
  totalCostUsd: '总成本',
};

const METRIC_PERCENT_KEYS = new Set<keyof PlatformMetrics>([
  'successRate',
  'approvalRate',
  'rejectRate',
  'reviseRate',
  'issueToPrRate',
  'auditCoverageRate',
  'toolInterceptRate',
  'workflowReuseRate',
]);

const METRIC_USD_KEYS = new Set<keyof PlatformMetrics>(['avgCostUsd', 'totalCostUsd']);

function formatMetricValue(key: keyof PlatformMetrics, value: number): string {
  if (METRIC_USD_KEYS.has(key)) return formatMetricUsd(value);
  return String(value);
}

interface ArchitectureOverviewProps {
  onNavigate?: (page: Page) => void;
  metrics?: PlatformMetrics | null;
}

function ImplBadge({ status }: { status: ImplStatus }) {
  return <span className={`impl-badge impl-${status}`}>{IMPL_LABEL[status]}</span>;
}

function ScopeBadge({ scope }: { scope: ManufacturingScope }) {
  return <span className={`mfg-scope mfg-scope-${scope}`}>{MANUFACTURING_SCOPE_LABEL[scope]}</span>;
}

export function ArchitectureOverview({ onNavigate, metrics }: ArchitectureOverviewProps) {
  return (
    <div className="arch-page">
      <header className="arch-hero">
        <p className="arch-kicker">agentOS · 系统化架构</p>
        <h2>{POSITIONING.tagline}</h2>
        <p>
          下图标注 <ImplBadge status="done" /> / <ImplBadge status="mock" /> / <ImplBadge status="planned" />{' '}
          表示各模块在前端本地模式下的实现程度。
        </p>
        <div className="arch-position-cards">
          <div className="arch-pos-card">
            <span>Agentic OS 能力</span>
            <p>{POSITIONING.vsAgenticOS}</p>
          </div>
          <div className="arch-pos-card">
            <span>Agent Factory 能力</span>
            <p>{POSITIONING.vsFactory}</p>
          </div>
          <div className="arch-pos-card">
            <span>智造基地 9 步</span>
            <p>{POSITIONING.vsManufacturingBase}</p>
          </div>
        </div>
        {onNavigate && (
          <div className="arch-hero-nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('tasks')}>
              工作台
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('agents')}>
              智能体
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('ai')}>
              AI 平台
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('tokens')}>
              用量监控
            </button>
            <span className="arch-hero-nav-hint">架构页为只读对照，功能在总览与各业务页体验</span>
          </div>
        )}
      </header>

      <section className="arch-section">
        <h3>功能入口一览</h3>
        <p className="section-desc">工作台 · 智能体 · AI 平台 · 用量监控 · 架构 — 本地模式下的核心产品面</p>
        <PlatformOverview variant="pages" onNavigate={onNavigate} />
      </section>

      {metrics && metrics.totalRuns > 0 && (
        <section className="arch-section">
          <h3>平台运行概览</h3>
          <p className="section-desc">来自本地任务和验收记录的实时统计</p>
          <PlatformOverview variant="welcome" metrics={metrics} onNavigate={onNavigate} />
        </section>
      )}

      <section className="arch-section">
        <h3>智造基地 9 步对照</h3>
        <p className="section-desc">
          产业级「AI 智能体智造基地」全景图。agentOS 已扩展 <strong>AI 平台</strong>（数据 · 训练 · 模型广场），并覆盖工程自动化链路的<strong>架构 · 研发 · 测试 · 安全</strong>。
        </p>
        <div className="mfg-legend">
          <ScopeBadge scope="focus" />
          <ScopeBadge scope="partial" />
          <ScopeBadge scope="excluded" />
          <span className="mfg-legend-hint">
            <ImplBadge status="done" /> / <ImplBadge status="mock" /> = agentOS 实现程度
          </span>
        </div>
        <div className="mfg-grid">
          {MANUFACTURING_BASE_9.map((item) => (
            <article
              key={item.step}
              className={`mfg-card mfg-scope-border-${item.scope}${item.scope === 'excluded' ? ' mfg-card-excluded' : ''}`}
            >
              <div className="mfg-card-head">
                <span className="mfg-step-num">{item.step}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p className="mfg-industry">{item.industryDesc}</p>
                </div>
              </div>
              <div className="mfg-card-badges">
                <ScopeBadge scope={item.scope} />
                {item.scope !== 'excluded' && <ImplBadge status={item.impl} />}
              </div>
              <dl className="mfg-card-map">
                <div>
                  <dt>agentOS 落点</dt>
                  <dd>{item.agentOS}</dd>
                </div>
                <div>
                  <dt>对应层级</dt>
                  <dd>{item.layerRef}</dd>
                </div>
              </dl>
              {item.demoPage && onNavigate && item.scope !== 'excluded' && (
                <button type="button" className="arch-link-btn mfg-link" onClick={() => onNavigate(item.demoPage!)}>
                  去体验 →
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="arch-section">
        <h3>六层架构（优化后）</h3>
        <p className="section-desc">自下而上：模型知识 → 治理 → 编排 → 运行时 → 能力包 → 体验</p>
        <ArchPipelineDiagram layers={ARCH_LAYERS} onNavigate={onNavigate} />
        <div className="arch-stack">
          {[...ARCH_LAYERS].reverse().map((layer) => (
            <div
              key={layer.id}
              className={`arch-stack-row status-${layer.status} ${layer.status === 'demo' ? 'is-demo' : ''}`}
            >
              <div className="arch-stack-meta">
                <span className={`arch-status-badge status-${layer.status}`}>
                  {STATUS_LABEL[layer.status]}
                </span>
                {layer.demoPage && onNavigate && (
                  <button type="button" className="arch-link-btn" onClick={() => onNavigate(layer.demoPage!)}>
                    去体验 →
                  </button>
                )}
              </div>
              <div className="arch-stack-body">
                <div className="arch-stack-title">
                  <strong>{layer.title}</strong>
                  <span>{layer.subtitle}</span>
                </div>
                <div className="arch-stack-cols">
                  <div>
                    <h4>能力模块</h4>
                    <ul className="arch-module-list">
                      {layer.modules.map((m) => (
                        <li key={m.name}>
                          <ImplBadge status={m.impl} />
                          {m.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="arch-stack-agentos">
                    <h4>agentOS 落点</h4>
                    <p>{layer.agentOS}</p>
                    {layer.demoLabel && <p className="arch-demo-tag">{layer.demoLabel}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="arch-section">
        <h3>六大设计原则</h3>
        <div className="arch-pillars">
          {ARCH_PILLARS.map((p) => (
            <div key={p.id} className="arch-pillar">
              <div className="arch-pillar-head">
                <strong>{p.title}</strong>
                <ImplBadge status={p.impl} />
              </div>
              <p>{p.desc}</p>
              <span className="arch-pillar-ref">{p.principle}</span>
              {p.demo && <span className="arch-demo-tag">当前：{p.demo}</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="arch-section">
        <h3>Agent 工厂化闭环</h3>
        <div className="factory-loop factory-loop-5">
          {FACTORY_LOOP.map((item, i) => (
            <div key={item.step} className="factory-pipeline-wrap">
              <div className="factory-step">
                <span className="factory-num">{item.step}</span>
                <div className="factory-step-head">
                  <strong>{item.title}</strong>
                  <ImplBadge status={item.impl} />
                </div>
                <p>{item.desc}</p>
              </div>
              {i < FACTORY_LOOP.length - 1 && <span className="factory-connector" aria-hidden>→</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="arch-section">
        <h3>分阶段优化路线（5 人团队）</h3>
        <div className="roadmap">
          {ROADMAP.map((phase) => (
            <div key={phase.phase} className={`roadmap-card roadmap-${phase.status}`}>
              <div className="roadmap-head">
                <span className="roadmap-phase">{phase.phase}</span>
                <strong>{phase.title}</strong>
                <span className="roadmap-status-tag">{ROADMAP_LABEL[phase.status]}</span>
              </div>
              <ul>
                {phase.focus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="roadmap-outcome">→ {phase.outcome}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="arch-section">
        <h3>价值度量体系</h3>
        {metrics && metrics.totalRuns > 0 ? (
          <p className="section-desc">以下数字来自当前任务数据</p>
        ) : (
          <p className="section-desc">创建任务后，此处会显示统计指标</p>
        )}
        <div className="metrics-grid">
          {METRICS.map((g) => (
            <div key={g.category} className="metrics-card">
              <strong>{g.category}</strong>
              {g.liveKeys && metrics && g.liveKeys.length > 0 && (
                <div className="metrics-live">
                  {g.liveKeys.map((key) => (
                    <span key={key} className="metrics-live-item">
                      {METRIC_LABELS[key] ?? key}：<strong>{formatMetricValue(key, metrics[key])}</strong>
                      {METRIC_PERCENT_KEYS.has(key) ? '%' : ''}
                    </span>
                  ))}
                </div>
              )}
              <ul>
                {g.metrics.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="arch-section arch-goals">
        <p className="arch-footnote">
          <strong>当前策略：</strong>
          {POSITIONING.focus}。P2 重点：Docker Runner、真实 GitHub PR、用户自定义 Skill。
        </p>
      </section>
    </div>
  );
}
