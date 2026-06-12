import { formatMetricUsd } from '@agentos/shared';
import type { Page } from './architecture/types';
import { OVERVIEW_MODULES, overviewModuleNumber, type ModuleIconId } from './modules';
import { ModuleIcon } from './icons';
import { PlatformOverview } from './PlatformOverview';
import type { PlatformMetrics } from './types';
import { WorkflowGuide } from './WorkflowGuide';
import { OverviewMiniDashboard } from './visuals/OverviewMiniDashboard';
import type { ExperienceProgressSummary } from './demo/experienceProgress';
import type { Run } from './types';

interface OverviewHomeProps {
  metrics: PlatformMetrics | null;
  pendingApprovalCount: number;
  agentCount: number;
  runs: Run[];
  onCreateRun: () => void;
  onNavigate: (page: Page) => void;
  onOpenPendingTasks?: () => void;
  onStartExperience?: () => void;
  onResumeExperience?: () => void;
  onViewExperienceSummary?: () => void;
  showExperienceCard?: boolean;
  experienceProgress?: ExperienceProgressSummary | null;
  experienceCompletedGroups?: string[];
  /** 与顶栏同步高亮：最近访问的业务模块 */
  highlightPage?: Page;
}

const HERO_SHORTCUTS: Array<{
  page: Page;
  label: string;
  icon: ModuleIconId;
  warn?: boolean;
}> = [
  { page: 'tasks', label: '工作台', icon: 'tasks' },
  { page: 'agents', label: '智能体', icon: 'agents' },
  { page: 'ai', label: 'AI 平台', icon: 'ai' },
  { page: 'tokens', label: '用量监控', icon: 'tokens' },
  { page: 'architecture', label: '架构', icon: 'architecture' },
];

const EXPERIENCE_CARD_STEPS: Array<{ groupId: string; label: string }> = [
  { groupId: 'approve', label: '工作台 · 人工验收修改方案' },
  { groupId: 'agents', label: '智能体 · 模型与能力包' },
  { groupId: 'ai', label: 'AI 平台 · 数据 → 训练 → 模型广场' },
  { groupId: 'tokens', label: '用量监控 · 消耗与预算' },
];

function OverviewStat({
  label,
  value,
  hint,
  tone = 'default',
  meterPercent,
  meterTone = 'ok',
  onClick,
  actionLabel,
  isActive,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: 'default' | 'accent' | 'warn' | 'success';
  meterPercent?: number;
  meterTone?: 'ok' | 'warn' | 'danger';
  onClick?: () => void;
  actionLabel?: string;
  isActive?: boolean;
}) {
  const meter = meterPercent !== undefined ? Math.max(0, Math.min(100, meterPercent)) : undefined;
  const className = `overview-stat overview-stat-${tone}${onClick ? ' overview-stat-action' : ''}${isActive ? ' is-active' : ''}`;

  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {meter !== undefined && (
        <div className="overview-stat-meter" aria-hidden>
          <div className="token-meter">
            <div className={`token-meter-fill token-meter-${meterTone}`} style={{ width: `${meter}%` }} />
          </div>
        </div>
      )}
      <p>{hint}</p>
      {onClick && <span className="overview-stat-go">{actionLabel ?? '查看 →'}</span>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}

export function OverviewHome({
  metrics,
  pendingApprovalCount,
  agentCount,
  runs,
  onCreateRun,
  onNavigate,
  onOpenPendingTasks,
  onStartExperience,
  onResumeExperience,
  onViewExperienceSummary,
  showExperienceCard = false,
  experienceProgress = null,
  experienceCompletedGroups = [],
  highlightPage,
}: OverviewHomeProps) {
  const totalRuns = metrics?.totalRuns ?? 0;
  const completedRuns = metrics?.completedRuns ?? 0;
  const issueToPrRate = metrics?.issueToPrRate ?? 0;
  const auditCoverageRate = metrics?.auditCoverageRate ?? 0;
  const avgCost = metrics ? formatMetricUsd(metrics.avgCostUsd) : '$0.0000';
  const hasRuns = totalRuns > 0;
  const completionRate = hasRuns ? Math.round((completedRuns / totalRuns) * 100) : 0;
  const pendingRate = hasRuns ? Math.round((pendingApprovalCount / totalRuns) * 100) : 0;
  const experienceStarted = experienceProgress !== null;
  const experiencePercent =
    experienceProgress && experienceProgress.total > 0
      ? Math.round((experienceProgress.completed / experienceProgress.total) * 100)
      : 0;

  return (
    <div className="overview-page">
      <section className="overview-hero">
        <div className="overview-hero-copy">
          <span className="task-hero-kicker">agentOS · 智能体工作台</span>
          <h2>把工程任务交给智能体，把最终决定权留给人</h2>
          <p>
            agentOS 是面向工程团队的本地控制台：用一段任务说明触发执行，用能力包限定智能体能做什么，
            生成修改方案后必须经过人工验收。
            <span className="overview-hero-assistant-hint">不知道怎么做时，点右下角「协同助手」。</span>
          </p>
          <div className="overview-hero-shortcuts" aria-label="快捷入口">
            {HERO_SHORTCUTS.map((item) => (
              <button
                key={item.page}
                type="button"
                className={`overview-hero-shortcut${highlightPage === item.page ? ' is-active' : ''}`}
                onClick={() => onNavigate(item.page)}
                aria-current={highlightPage === item.page ? 'page' : undefined}
              >
                <span className="module-icon-shell module-icon-shell-sm">
                  <ModuleIcon id={item.icon} size="sm" />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
            {pendingApprovalCount > 0 && (
              <button
                type="button"
                className="overview-hero-shortcut is-warn"
                onClick={() => (onOpenPendingTasks ? onOpenPendingTasks() : onNavigate('tasks'))}
              >
                <span className="overview-hero-shortcut-badge">{pendingApprovalCount}</span>
                <span>待验收</span>
              </button>
            )}
            {experienceProgress?.showBadge && onViewExperienceSummary && (
              <button
                type="button"
                className={`overview-hero-shortcut overview-hero-experience-progress${experienceProgress.tourFinished ? ' is-complete' : ''}`}
                onClick={onViewExperienceSummary}
              >
                <span className="overview-hero-shortcut-badge">
                  {experienceProgress.completed}/{experienceProgress.total}
                </span>
                <span>{experienceProgress.tourFinished ? '体验完成' : '体验进度'}</span>
              </button>
            )}
          </div>
          <div className="task-hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onCreateRun}>
              新建任务说明
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => onNavigate('tasks')}>
              进入工作台
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => onNavigate('agents')}>
              配置智能体
            </button>
          </div>
        </div>
      </section>

      <OverviewMiniDashboard
        metrics={metrics}
        pendingApprovalCount={pendingApprovalCount}
        agentCount={agentCount}
        runs={runs}
        onNavigate={onNavigate}
        onOpenPendingTasks={onOpenPendingTasks}
        highlightPage={highlightPage}
      />

      {showExperienceCard && onStartExperience && (
        <section className="overview-experience-card" data-tour="overview-experience">
          <div>
            <span className="section-kicker">5 分钟完整体验</span>
            <h3>
              {experienceProgress?.tourFinished
                ? '体验引导已完成，可随时查看总结或再走一遍'
                : experienceStarted
                  ? '继续走完演示流程，或查看当前进度'
                  : '一键填充演示数据，跟着引导走完核心流程'}
            </h3>
            <p>
              自动创建待验收任务、已完成样例，以及 AI 平台数据集与微调模型。适合第一次打开或对内演示。
            </p>
            {experienceStarted && experienceProgress && !experienceProgress.tourFinished && pendingApprovalCount > 0 && !experienceProgress.approveComplete ? (
              <div className="overview-experience-reminder" role="note">
                <strong>还有 {pendingApprovalCount} 个待验收任务</strong>
                <p>建议进入工作台完成人工验收，或点「继续引导」恢复上次步骤。</p>
                {onOpenPendingTasks ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenPendingTasks}>
                    去工作台验收
                  </button>
                ) : null}
              </div>
            ) : null}
            {experienceStarted && experienceProgress ? (
              <div className="overview-experience-progress" aria-label="体验进度">
                <div className="overview-experience-progress-bar" aria-hidden>
                  <div className="overview-experience-progress-fill" style={{ width: `${experiencePercent}%` }} />
                </div>
                <span>
                  已完成 {experienceProgress.completed}/{experienceProgress.total} 阶段
                  {experienceProgress.approveComplete ? ' · 验收已通过' : ''}
                </span>
              </div>
            ) : null}
            <ol className="overview-experience-steps">
              {EXPERIENCE_CARD_STEPS.map((item) => (
                <li
                  key={item.groupId}
                  className={experienceCompletedGroups.includes(item.groupId) ? 'is-done' : undefined}
                >
                  {item.label}
                </li>
              ))}
            </ol>
          </div>
          <div className="overview-experience-actions">
            {experienceProgress?.tourFinished ? (
              <>
                {onViewExperienceSummary ? (
                  <button type="button" className="btn btn-primary btn-lg" onClick={onViewExperienceSummary}>
                    查看总结
                  </button>
                ) : null}
                <button type="button" className="btn btn-ghost btn-lg" onClick={onStartExperience}>
                  再走一遍
                </button>
              </>
            ) : experienceStarted ? (
              <>
                {onResumeExperience ? (
                  <button type="button" className="btn btn-primary btn-lg" onClick={onResumeExperience}>
                    继续引导
                  </button>
                ) : null}
                {experienceProgress?.showBadge && onViewExperienceSummary ? (
                  <button type="button" className="btn btn-ghost btn-lg" onClick={onViewExperienceSummary}>
                    查看总结
                  </button>
                ) : null}
                <button type="button" className="btn btn-ghost btn-lg" onClick={onStartExperience}>
                  重新开始
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-lg" onClick={onStartExperience}>
                开始 5 分钟体验
              </button>
            )}
          </div>
        </section>
      )}

      <section className="overview-section">
        <div className="overview-section-head">
          <div>
            <span className="section-kicker">功能入口</span>
            <h3>按你的目标进入对应页面</h3>
          </div>
        </div>
        <div className="overview-entry-grid">
            {OVERVIEW_MODULES.map((module, index) => (
              <button
                key={module.page}
                type="button"
                className={`overview-entry-card${highlightPage === module.page ? ' is-active' : ''}`}
                onClick={() => onNavigate(module.page)}
                aria-current={highlightPage === module.page ? 'page' : undefined}
              >
              <div className="overview-entry-card-top">
                <span className="module-icon-shell module-icon-shell-lg">
                  <ModuleIcon id={module.icon} size="md" label={module.label} />
                </span>
                <span className="overview-entry-num">{overviewModuleNumber(index)}</span>
              </div>
              <strong>{module.label}</strong>
              <p>{module.entryDesc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="overview-section overview-workflow-section">
        <div className="overview-section-head">
          <div>
            <span className="section-kicker">工作方式</span>
            <h3>10-80-10 的协作闭环</h3>
          </div>
        </div>
        <WorkflowGuide />
      </section>

      <PlatformOverview
        variant="welcome"
        metrics={null}
        pendingApprovalCount={pendingApprovalCount}
        onNavigate={onNavigate}
      />

      <section className="overview-section">
        <div className="overview-section-head">
          <div>
            <span className="section-kicker">运行概览</span>
            <h3>今天先看这些数</h3>
          </div>
          <button type="button" className="arch-link-btn" onClick={() => onNavigate('architecture')}>
            查看完整度量 →
          </button>
        </div>
        <div className="overview-stats-grid">
          <OverviewStat
            label="总任务"
            value={totalRuns}
            hint={hasRuns ? `${completedRuns} 个已完成` : '等待首个任务'}
            tone="accent"
            meterPercent={completionRate}
            meterTone="ok"
            onClick={() => onNavigate('tasks')}
            actionLabel="工作台 →"
            isActive={highlightPage === 'tasks'}
          />
          <OverviewStat
            label="待验收"
            value={pendingApprovalCount}
            hint={pendingApprovalCount > 0 ? '需要人工确认' : '当前没有待办'}
            tone={pendingApprovalCount > 0 ? 'warn' : 'default'}
            meterPercent={pendingRate}
            meterTone={pendingApprovalCount > 0 ? 'warn' : 'ok'}
            onClick={() => (onOpenPendingTasks ? onOpenPendingTasks() : onNavigate('tasks'))}
            actionLabel="去验收 →"
            isActive={highlightPage === 'tasks'}
          />
          <OverviewStat
            label="任务→方案"
            value={`${issueToPrRate}%`}
            hint="生成修改方案的比例"
            tone="success"
            meterPercent={issueToPrRate}
            meterTone="ok"
            onClick={() => onNavigate('architecture')}
            actionLabel="完整度量 →"
            isActive={highlightPage === 'architecture'}
          />
          <OverviewStat
            label="记录覆盖"
            value={`${auditCoverageRate}%`}
            hint="有过程记录的比例"
            meterPercent={auditCoverageRate}
            meterTone={auditCoverageRate >= 80 ? 'ok' : 'warn'}
            onClick={() => onNavigate('tasks')}
            actionLabel="任务记录 →"
            isActive={highlightPage === 'tasks'}
          />
          <OverviewStat
            label="平均成本"
            value={avgCost}
            hint="按用量估算"
            onClick={() => onNavigate('tokens')}
            actionLabel="用量监控 →"
            isActive={highlightPage === 'tokens'}
          />
        </div>
      </section>
    </div>
  );
}
