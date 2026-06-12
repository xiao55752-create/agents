import { formatMetricUsd } from '@agentos/shared';

export interface ExperienceSummaryMetrics {
  pendingCount: number;
  completedCount: number;
  totalTokens: number;
  totalCostUsd: number;
  aiDatasetReady: boolean;
  fineTunedModelReady: boolean;
}

interface ExperienceSummaryProps {
  metrics: ExperienceSummaryMetrics;
  onClose: () => void;
  onGoApprove: () => void;
  onCreateTask: () => void;
  onOpenOnboarding: () => void;
  onOpenAi: () => void;
  onRestartExperience?: () => void;
}

export function ExperienceSummary({
  metrics,
  onClose,
  onGoApprove,
  onCreateTask,
  onOpenOnboarding,
  onOpenAi,
  onRestartExperience,
}: ExperienceSummaryProps) {
  const hasPendingApproval = metrics.pendingCount > 0;
  const loopClosed = !hasPendingApproval && metrics.completedCount > 0;

  return (
    <div className="experience-summary-backdrop" onClick={onClose}>
      <div className="experience-summary-modal" onClick={(e) => e.stopPropagation()}>
        <span className="section-kicker">体验完成</span>
        <h2>{loopClosed ? '核心 Demo 闭环已完成' : '你已经走完 agentOS 核心 Demo 路径'}</h2>
        <p className="experience-summary-lead">
          {loopClosed
            ? '演示任务已全部验收。本地数据已保留，你可以继续探索 AI 平台、微调模型，或新建自己的任务。'
            : '下面是当前演示数据的实时快照。建议先完成待验收任务，再走一遍完整人工确认流程。'}
        </p>

        {loopClosed ? (
          <div className="experience-summary-success" role="status">
            <strong>人工验收已完成</strong>
            <p>待验收任务已清零 · 已完成 {metrics.completedCount} 个演示任务</p>
          </div>
        ) : null}

        {hasPendingApproval && (
          <div className="experience-summary-cta" role="note">
            <strong>建议先完成人工验收</strong>
            <p>
              还有 {metrics.pendingCount} 个待验收任务。进入工作台后，在右侧验收区查看修改方案并点击
              <span className="experience-summary-cta-mark">通过</span>
              ，才算走完完整闭环。
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onGoApprove}>
              去工作台验收
            </button>
          </div>
        )}

        <div className="experience-summary-grid">
          <article className={hasPendingApproval ? 'is-warn' : loopClosed ? 'is-success' : undefined}>
            <span>待验收</span>
            <strong>{metrics.pendingCount}</strong>
            <p>{hasPendingApproval ? '个修改方案等你确认' : '已全部处理'}</p>
          </article>
          <article>
            <span>已完成</span>
            <strong>{metrics.completedCount}</strong>
            <p>个演示任务</p>
          </article>
          <article>
            <span>总消耗</span>
            <strong>{metrics.totalTokens.toLocaleString()}</strong>
            <p>tokens · {formatMetricUsd(metrics.totalCostUsd)}</p>
          </article>
          <article>
            <span>AI 平台</span>
            <strong>{metrics.fineTunedModelReady ? '已就绪' : '部分'}</strong>
            <p>
              {metrics.aiDatasetReady ? '数据集已清洗' : '数据集待准备'}
              {metrics.fineTunedModelReady ? ' · 微调模型已发布' : ''}
            </p>
          </article>
        </div>

        <ul className="experience-summary-checklist">
          <li className={loopClosed ? 'is-done' : undefined}>人工验收：智能体生成方案后必须你来决定</li>
          <li>能力包：权限边界清晰，支持自定义创建</li>
          <li className={metrics.fineTunedModelReady ? 'is-done' : undefined}>AI 平台：数据 → 训练 → 模型广场闭环</li>
          <li>用量监控：预算预警与通知联动</li>
        </ul>

        <div className="experience-summary-actions">
          {onRestartExperience ? (
            <button type="button" className="btn btn-ghost" onClick={onRestartExperience}>
              再走一遍体验
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onOpenOnboarding}>
            新手引导
          </button>
          <button type="button" className="btn btn-ghost" onClick={onOpenAi}>
            打开 AI 平台
          </button>
          {hasPendingApproval ? (
            <button type="button" className="btn btn-primary" onClick={onGoApprove}>
              去验收
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onCreateTask}>
              新建任务
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
