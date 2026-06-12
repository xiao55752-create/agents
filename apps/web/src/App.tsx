import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  approveRun,
  cancelRun,
  createRun,
  deleteRun,
  fetchAgents,
  fetchAudit,
  fetchIntegrations,
  fetchMetrics,
  fetchRun,
  fetchRuns,
  fetchWorkflowDataStats,
  getAgentBudgetStatus,
  exportDemoData,
  importDemoData,
  IS_FRONTEND_DEMO,
  rejectRun,
  resetDemoData,
  seedDemoExperience,
  retryRun,
  reviseRun,
  subscribeLogs,
  type Agent,
  type AuditEvent,
  type IntegrationsStatus,
  type LogEntry,
  type PlatformMetrics,
  type Run,
  type RunStatus,
} from './api';
import { AuditTimeline } from './AuditTimeline';
import { ApprovalGate } from './ApprovalGate';
import { GatePrecheck } from './GatePrecheck';
import { RoundCompare } from './RoundCompare';
import { hasRoundComparison } from './runRounds';
import {
  buildMockChangedFiles,
  buildMockDiff,
  formatRunDuration,
  friendlyCompletionGate,
  friendlyLogMessage,
  friendlyModelName,
  friendlyRepoName,
  friendlySummary,
  friendlyTaskTitle,
  friendlyToolName,
  isProgressActive,
  isProgressDone,
  PROGRESS_STEPS,
  progressStepIndex,
  STATUS_HINT,
  STATUS_LABEL,
} from './friendly';
import { WorkflowGuide } from './WorkflowGuide';
import { EmptyState } from './visuals/EmptyState';
import { WorkbenchFlowGuide } from './WorkbenchFlowGuide';
import { AgentEditor } from './AgentEditor';
import { ArchitectureOverview } from './architecture/ArchitectureOverview';
import type { Page } from './architecture/types';
import { OverviewHome } from './OverviewHome';
import { AuthPage, clearAuthSession, readAuthSession, type AuthUser } from './AuthPage';
import { TokenMonitor } from './TokenMonitor';
import { AiPlatform } from './AiPlatform';
import { AssistantPanel } from './AssistantPanel';
import { DemoExperienceTour } from './DemoExperienceTour';
import { ExperienceSummary } from './ExperienceSummary';
import { OnboardingGuide } from './OnboardingGuide';
import { getAiPlatformState } from './aiPlatform/store';
import { isOnboardingDone } from './assistant/onboarding';
import type { AssistantAction, AssistantContext } from './assistant/types';
import { setAiPlatformTab } from './aiPlatform/store';
import { syncWorkflowDataSources } from './aiPlatform/syncWorkflowData';
import {
  enterPresentationFullscreen,
  exitPresentationFullscreen,
  isPresentationMode,
  setPresentationMode,
  togglePresentationMode,
} from './demo/presentationMode';
import {
  initExperienceProgress,
  markExperienceGroupComplete,
  markExperienceTourFinishedInProgress,
  readExperienceProgress,
  resetExperienceProgress,
  summarizeExperienceProgress,
} from './demo/experienceProgress';
import { NAV_MODULES } from './modules';
import { ModuleIcon } from './icons';
import { NotificationCenter } from './NotificationCenter';
import {
  computeNotifications,
  readNotificationIds,
  saveNotificationIds,
  type AppNotification,
} from './notifications';

type StatusFilterKey = '' | 'active' | 'terminal' | RunStatus;

const ACTIVE_STATUSES = new Set<RunStatus>(['pending', 'queued', 'provisioning', 'running', 'pr_opened']);
const TERMINAL_STATUSES = new Set<RunStatus>(['completed', 'failed', 'cancelled']);
const STATUS_FILTER_OPTIONS: Array<{ key: StatusFilterKey; label: string }> = [
  { key: '', label: '全部' },
  { key: 'needs_approval', label: '待验收' },
  { key: 'active', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'failed', label: '失败' },
  { key: 'terminal', label: '已结束' },
];

function StatusBadge({ status }: { status: RunStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}

function matchesStatusFilter(run: Run, filter: StatusFilterKey) {
  if (!filter) return true;
  if (filter === 'active') return ACTIVE_STATUSES.has(run.status);
  if (filter === 'terminal') return TERMINAL_STATUSES.has(run.status);
  return run.status === filter;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function ProgressBar({ status }: { status: RunStatus }) {
  const current = progressStepIndex(status);
  const isBadEnd = status === 'failed' || status === 'cancelled';

  return (
    <div className="progress">
      {PROGRESS_STEPS.map((step, i) => {
        const done = isProgressDone(status, i);
        const active = isProgressActive(status, i);
        const isLast = i === PROGRESS_STEPS.length - 1;
        let stateClass = '';
        if (isLast && isBadEnd) stateClass = 'step-bad';
        else if (done) stateClass = 'step-done';
        else if (active) stateClass = 'step-active';

        return (
          <div key={step.key} className={`progress-step ${stateClass}`}>
            <div className="progress-dot">{done && !isBadEnd ? '✓' : i + 1}</div>
            <span className="progress-label">{step.label}</span>
            {i < PROGRESS_STEPS.length - 1 && <div className="progress-line" />}
          </div>
        );
      })}
      <p className="progress-hint">{STATUS_HINT[status] ?? ''}</p>
      {status === 'failed' && <p className="progress-hint progress-hint-bad">任务未能完成</p>}
      {status === 'cancelled' && <p className="progress-hint progress-hint-bad">任务已取消</p>}
      {status === 'completed' && current === 4 && (
        <p className="progress-hint progress-hint-good">全部步骤已完成</p>
      )}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => readAuthSession());
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [repo, setRepo] = useState('我的团队/网站项目');
  const [issueTitle, setIssueTitle] = useState('登录按钮点击后没反应');
  const [issueBody, setIssueBody] = useState(
    '用户点击登录按钮后页面无响应，控制台无报错。期望：未登录时跳转登录页或给出提示。',
  );
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(
    '1. 未登录点击时有明确提示或跳转\n2. npm test 全部通过\n3. 不改动与登录无关的文件',
  );
  const [issueNumber, setIssueNumber] = useState('42');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [page, setPage] = useState<Page>(() => (readAuthSession() ? 'overview' : 'auth'));
  const [lastModulePage, setLastModulePage] = useState<Page>('tasks');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null);
  const [showPrPreview, setShowPrPreview] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [logsExpanded, setLogsExpanded] = useState(true);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);
  const [presentationMode, setPresentationModeState] = useState(() => isPresentationMode());
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [readNotificationIdsState, setReadNotificationIdsState] = useState<Set<string>>(() => readNotificationIds());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExperienceTour, setShowExperienceTour] = useState(false);
  const [showExperienceSummary, setShowExperienceSummary] = useState(false);
  const [experiencePendingRunId, setExperiencePendingRunId] = useState<string | null>(null);
  const [experienceTourStartIndex, setExperienceTourStartIndex] = useState(0);
  const [experienceProgressTick, setExperienceProgressTick] = useState(0);

  const selectedAgent = selectedRun ? agents.find((a) => a.id === selectedRun.agentId) : null;
  const pendingApprovalCount = runs.filter((r) => r.status === 'needs_approval').length;
  const experienceSummaryMetrics = useMemo(
    () => {
      const aiState = getAiPlatformState();
      return {
        pendingCount: pendingApprovalCount,
        completedCount: runs.filter((run) => run.status === 'completed').length,
        totalTokens: metrics?.totalTokens ?? runs.reduce((sum, run) => sum + run.tokensUsed, 0),
        totalCostUsd: metrics?.totalCostUsd ?? 0,
        aiDatasetReady: aiState.datasets.some((item) => item.cleaned),
        fineTunedModelReady: aiState.fineTunedModels.length > 0,
      };
    },
    [pendingApprovalCount, runs, metrics],
  );
  const experiencePendingApproved = useMemo(() => {
    if (!experiencePendingRunId) return false;
    const run = runs.find((item) => item.id === experiencePendingRunId);
    return run ? run.status !== 'needs_approval' : false;
  }, [experiencePendingRunId, runs]);
  const experienceProgress = useMemo(
    () => summarizeExperienceProgress(readExperienceProgress()),
    [experienceProgressTick, experiencePendingApproved],
  );
  const experienceCompletedGroups = useMemo(
    () => readExperienceProgress()?.completedGroups ?? [],
    [experienceProgressTick, experiencePendingApproved],
  );

  function bumpExperienceProgress() {
    setExperienceProgressTick((value) => value + 1);
  }
  const notifications = useMemo(() => computeNotifications(agents, runs), [agents, runs]);
  const assistantContext = useMemo<AssistantContext>(() => {
    const budgetWarningCount = agents.filter((agent) => {
      const status = getAgentBudgetStatus(agent.id);
      return status === 'warn' || status === 'exceeded';
    }).length;

    const selectedRunContext = selectedRun
      ? {
          id: selectedRun.id,
          title: friendlyTaskTitle(selectedRun),
          status: selectedRun.status,
        }
      : null;

    return {
      page,
      totalRuns: runs.length,
      pendingApprovalCount,
      agentCount: agents.length,
      budgetWarningCount,
      selectedRun: selectedRunContext,
    };
  }, [page, runs.length, pendingApprovalCount, agents, selectedRun]);
  const createBudgetStatus = selectedAgentId ? getAgentBudgetStatus(selectedAgentId) : 'ok';

  const filteredRuns = runs
    .filter((run) => {
      if (!matchesStatusFilter(run, statusFilter)) return false;
      if (agentFilter && run.agentId !== agentFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const title = (run.input.issueTitle ?? '').toLowerCase();
      const body = (run.input.issueBody ?? '').toLowerCase();
      const criteria = (run.input.acceptanceCriteria ?? '').toLowerCase();
      const repoName = run.input.repo.toLowerCase();
      return title.includes(q) || body.includes(q) || criteria.includes(q) || repoName.includes(q);
    })
    .sort((a, b) => {
      if (a.status === 'needs_approval' && b.status !== 'needs_approval') return -1;
      if (b.status === 'needs_approval' && a.status !== 'needs_approval') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const refreshMetrics = useCallback(async () => {
    const m = await fetchMetrics();
    setMetrics(m);
  }, []);

  const refreshRuns = useCallback(async () => {
    const list = await fetchRuns();
    setRuns(list);
    if (selectedId) {
      const run = await fetchRun(selectedId);
      setSelectedRun(run);
    }
    await refreshMetrics();
    if (IS_FRONTEND_DEMO) {
      syncWorkflowDataSources(fetchWorkflowDataStats());
    }
  }, [selectedId, refreshMetrics]);

  useEffect(() => {
    void fetchAgents().then((list) => {
      setAgents(list);
      setSelectedAgentId((prev) => prev || list[0]?.id || '');
    });
    void fetchIntegrations().then(setIntegrations);
  }, []);

  useEffect(() => {
    void refreshRuns();
    const t = setInterval(() => void refreshRuns(), 2000);
    return () => clearInterval(t);
  }, [refreshRuns]);

  useEffect(() => {
    if (!selectedRun) return;
    const running = ['pending', 'queued', 'provisioning', 'running', 'pr_opened'].includes(selectedRun.status);
    setLogsExpanded(running);
  }, [selectedRun?.id, selectedRun?.status]);

  useEffect(() => {
    setMobileHeaderMenuOpen(false);
    const wrap = navScrollRef.current;
    if (!wrap) return;
    const active = wrap.querySelector<HTMLElement>('.nav-tab.active');
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [page]);

  useEffect(() => {
    if (page !== 'overview' && page !== 'auth') {
      setLastModulePage(page);
    }
  }, [page]);

  useEffect(() => {
    document.body.classList.toggle('presentation-mode', presentationMode);
    return () => document.body.classList.remove('presentation-mode');
  }, [presentationMode]);

  useEffect(() => {
    if (!showExperienceSummary) return;
    void refreshRuns();
    const t = setInterval(() => void refreshRuns(), 1500);
    return () => clearInterval(t);
  }, [showExperienceSummary, refreshRuns]);

  useEffect(() => {
    if (!presentationMode) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') void handleExitPresentationMode();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [presentationMode]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement && isPresentationMode()) {
        setPresentationMode(false);
        setPresentationModeState(false);
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const wrap = navScrollRef.current;
    if (!wrap || !currentUser) return;

    const updateScrollable = () => {
      const scrollable = wrap.scrollWidth > wrap.clientWidth + 2;
      wrap.classList.toggle('is-scrollable', scrollable);
    };

    updateScrollable();
    const observer = new ResizeObserver(updateScrollable);
    observer.observe(wrap);
    wrap.addEventListener('scroll', updateScrollable, { passive: true });
    window.addEventListener('resize', updateScrollable);

    return () => {
      observer.disconnect();
      wrap.removeEventListener('scroll', updateScrollable);
      window.removeEventListener('resize', updateScrollable);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedRun(null);
      setLogs([]);
      setAuditEvents([]);
      return;
    }
    void fetchRun(selectedId).then(setSelectedRun);
    void fetchAudit(selectedId).then(setAuditEvents);
    setLogs([]);
    const unsub = subscribeLogs(selectedId, (log) => {
      setLogs((prev) => (prev.some((l) => l.id === log.id) ? prev : [...prev, log]));
    });
    const auditPoll = setInterval(() => {
      void fetchAudit(selectedId).then(setAuditEvents);
    }, 2000);
    return () => {
      unsub();
      clearInterval(auditPoll);
    };
  }, [selectedId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const run = await createRun({
        repo,
        issueTitle,
        issueBody: issueBody.trim() || undefined,
        acceptanceCriteria: acceptanceCriteria.trim() || undefined,
        issueNumber: Number(issueNumber) || undefined,
        agentId: selectedAgentId || undefined,
      });
      setShowCreate(false);
      setSelectedId(run.id);
      await refreshRuns();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '创建任务失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedId) return;
    await approveRun(selectedId);
    await refreshRuns();
    void fetchAudit(selectedId).then(setAuditEvents);
    if (IS_FRONTEND_DEMO && experiencePendingRunId && selectedId === experiencePendingRunId) {
      markExperienceGroupComplete('approve');
      bumpExperienceProgress();
    }
  }

  async function handleReject(reason?: string) {
    if (!selectedId) return;
    await rejectRun(selectedId, reason);
    await refreshRuns();
    void fetchAudit(selectedId).then(setAuditEvents);
  }

  async function handleRevise(notes: string) {
    if (!selectedId) return;
    await reviseRun(selectedId, notes);
    setLogs([]);
    await refreshRuns();
    void fetchAudit(selectedId).then(setAuditEvents);
  }

  async function handleCancel() {
    if (!selectedId) return;
    await cancelRun(selectedId);
    await refreshRuns();
    void fetchAudit(selectedId).then(setAuditEvents);
  }

  async function handleRetry() {
    if (!selectedId) return;
    await retryRun(selectedId);
    setAuditEvents([]);
    setLogs([]);
    await refreshRuns();
  }

  async function handleDeleteRun() {
    if (!selectedId || !selectedRun) return;
    if (!window.confirm(`确定删除任务「${friendlyTaskTitle(selectedRun)}」？`)) return;
    await deleteRun(selectedId);
    setSelectedId(null);
    await refreshRuns();
  }

  async function handleStartExperience() {
    if (!IS_FRONTEND_DEMO) return;
    const replace = runs.length > 0;
    if (replace && !window.confirm('将替换当前任务数据并填充演示内容，继续？')) return;
    const result = await seedDemoExperience(replace);
    setExperiencePendingRunId(result.pendingRunId);
    setSelectedId(result.pendingRunId);
    initExperienceProgress();
    setExperienceTourStartIndex(0);
    bumpExperienceProgress();
    await refreshRuns();
    setPage('overview');
    setShowExperienceSummary(false);
    setShowExperienceTour(true);
  }

  function handleResumeExperience() {
    if (!IS_FRONTEND_DEMO) return;
    const progress = readExperienceProgress();
    if (!progress) {
      void handleStartExperience();
      return;
    }
    setExperienceTourStartIndex(progress.lastStepIndex);
    setShowExperienceSummary(false);
    setShowExperienceTour(true);
  }

  function handleFocusExperienceRun(runId: string) {
    setSelectedId(runId);
    setPage('tasks');
  }

  function handleGoPendingApproval() {
    const pending = runs.find((run) => run.status === 'needs_approval');
    if (pending) setSelectedId(pending.id);
    setStatusFilter('needs_approval');
    setPage('tasks');
  }

  function handleTogglePresentationMode() {
    const next = togglePresentationMode();
    setPresentationModeState(next);
    if (next) {
      void enterPresentationFullscreen();
    } else {
      void exitPresentationFullscreen();
    }
  }

  function handleExitPresentationMode() {
    setPresentationMode(false);
    setPresentationModeState(false);
    void exitPresentationFullscreen();
  }

  async function handleResetDemo() {
    if (!window.confirm('清空所有本地数据（任务、智能体恢复默认）？此操作不可撤销。')) return;
    await resetDemoData();
    resetExperienceProgress();
    bumpExperienceProgress();
    setSelectedId(null);
    const list = await fetchAgents();
    setAgents(list);
    await refreshRuns();
  }

  async function handleExportDemo() {
    try {
      const data = await exportDemoData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agentos-local-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '导出失败');
    }
  }

  async function handleImportDemo(file: File | null) {
    if (!file) return;
    if (!window.confirm('导入会替换当前本地数据（任务、智能体、审计、日志）。确定继续？')) {
      if (importInputRef.current) importInputRef.current.value = '';
      return;
    }
    try {
      const raw = await file.text();
      await importDemoData(raw);
      setSelectedId(null);
      const list = await fetchAgents();
      setAgents(list);
      setSelectedAgentId(list[0]?.id ?? '');
      await refreshRuns();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '导入失败');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }

  function handleClearTaskFilters() {
    setStatusFilter('');
    setSearchQuery('');
    setAgentFilter('');
  }

  function handleAuthSuccess(user: AuthUser) {
    setCurrentUser(user);
    setPage('overview');
    if (!isOnboardingDone()) {
      setShowOnboarding(true);
    }
  }

  function handleLogout() {
    clearAuthSession();
    setCurrentUser(null);
    setSelectedId(null);
    setSelectedRun(null);
    setPage('auth');
  }

  function handleMarkNotificationRead(id: string) {
    setReadNotificationIdsState((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveNotificationIds(next);
      return next;
    });
  }

  function handleMarkAllNotificationsRead() {
    const next = new Set(notifications.map((item) => item.id));
    setReadNotificationIdsState(next);
    saveNotificationIds(next);
  }

  function handleOpenNotification(notification: AppNotification) {
    handleMarkNotificationRead(notification.id);
    if (notification.runId) {
      setSelectedId(notification.runId);
      setPage('tasks');
      return;
    }
    setPage(notification.page);
  }

  function handleAssistantAction(action: AssistantAction) {
    switch (action.type) {
      case 'navigate':
        setPage(action.page);
        break;
      case 'create_task':
        setPage('tasks');
        setShowCreate(true);
        break;
      case 'open_onboarding':
        setShowOnboarding(true);
        break;
      case 'open_ai':
        if (action.tab) setAiPlatformTab(action.tab);
        setPage('ai');
        break;
      case 'focus_pending': {
        const pending = runs.find((run) => run.status === 'needs_approval');
        if (pending) {
          setSelectedId(pending.id);
          setPage('tasks');
        } else {
          setPage('tasks');
        }
        break;
      }
      case 'open_selected_task':
        if (selectedId) {
          setPage('tasks');
        } else {
          setPage('tasks');
        }
        break;
      default:
        break;
    }
  }

  const hasTaskFilters = Boolean(statusFilter || searchQuery.trim() || agentFilter);

  return (
    <div className={`app${presentationMode ? ' is-presentation' : ''}`}>
      {currentUser && presentationMode && (
        <div className="presentation-banner">
          <span>演示模式 · 全屏投屏 · 界面已简化 · 按 Esc 退出</span>
          <div className="presentation-banner-actions">
            {IS_FRONTEND_DEMO && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleStartExperience()}>
                5 分钟体验
              </button>
            )}
            {!isFullscreen && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void enterPresentationFullscreen()}>
                进入全屏
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>
              打印 / 导出 PDF
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleExitPresentationMode}>
              退出演示
            </button>
          </div>
        </div>
      )}
      <header className={currentUser ? 'header' : 'header auth-header'}>
        <div className="header-start">
          <div className="brand">
            <span className="logo">⬡</span>
            <div>
              <h1>agentOS</h1>
              <p>智能体工程工作台</p>
            </div>
          </div>
          {currentUser && (
            <button
              type="button"
              className="header-menu-toggle"
              aria-expanded={mobileHeaderMenuOpen}
              aria-controls="header-actions-panel"
              onClick={() => setMobileHeaderMenuOpen((open) => !open)}
            >
              {mobileHeaderMenuOpen ? '收起' : '菜单'}
            </button>
          )}
        </div>
        {currentUser && (
          <div className="header-nav-slot">
            <div className="nav-tabs-scroll-wrap" ref={navScrollRef}>
              <nav className="nav-tabs" aria-label="主导航">
                {NAV_MODULES.map((module) => (
                  <button
                    key={module.page}
                    type="button"
                    className={page === module.page ? 'nav-tab active' : 'nav-tab'}
                    onClick={() => setPage(module.page)}
                    aria-label={module.label}
                    title={module.label}
                  >
                    <ModuleIcon id={module.icon} size="sm" />
                    <span>{module.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
        <div
          id="header-actions-panel"
          className={`header-actions${mobileHeaderMenuOpen ? ' is-expanded' : ''}${!currentUser ? ' is-auth' : ''}`}
        >
          {!currentUser && <span className="auth-header-note">登录后进入工作台</span>}
          {currentUser && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowOnboarding(true)}>
              新手引导
            </button>
          )}
          {currentUser && (
            <NotificationCenter
              notifications={notifications}
              readIds={readNotificationIdsState}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onOpen={handleOpenNotification}
            />
          )}
          {currentUser && (
            <div className="user-menu">
              <span>
                {currentUser.name}
                <small>{currentUser.email}</small>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                退出
              </button>
            </div>
          )}
          {currentUser && (
            <label className="dev-toggle">
              <input type="checkbox" checked={devMode} onChange={(e) => setDevMode(e.target.checked)} />
              开发者视图
            </label>
          )}
          {currentUser && page === 'tasks' && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + 新建任务说明
            </button>
          )}
        </div>
      </header>

      {currentUser && integrations && (
        <div className={`integration-bar integration-${integrations.mode}`}>
          {IS_FRONTEND_DEMO ? (
            <>
              <span className="presentation-hide">本地模式 — 数据保存在浏览器{page === 'agents' ? '（含智能体配置）' : ''}</span>
              <div className="integration-actions">
                <button type="button" className="btn btn-ghost btn-sm presentation-hide" onClick={() => void handleStartExperience()}>
                  5 分钟体验
                </button>
                <button
                  type="button"
                  className={presentationMode ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  onClick={handleTogglePresentationMode}
                >
                  {presentationMode ? '演示中' : '演示模式'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm presentation-hide" onClick={() => void handleExportDemo()}>
                  导出 JSON
                </button>
                <button type="button" className="btn btn-ghost btn-sm presentation-hide" onClick={() => importInputRef.current?.click()}>
                  导入 JSON
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger-text presentation-hide" onClick={() => void handleResetDemo()}>
                  清空本地数据
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="visually-hidden"
                  onChange={(e) => void handleImportDemo(e.target.files?.[0] ?? null)}
                />
              </div>
            </>
          ) : integrations.mode === 'live' ? (
            <>
              <span>已启用真实集成</span>
              {integrations.llm === 'anthropic' && <span className="tag">LLM ✓</span>}
              {integrations.github === 'enabled' && <span className="tag">GitHub ✓</span>}
            </>
          ) : (
            <span>联调模式 — 配置 .env 启用真实 API 集成</span>
          )}
        </div>
      )}

      {currentUser && runs.length === 0 && page !== 'auth' && !presentationMode && (
        <div className="guide-banner">
          <span>第一次使用？点总览「开始 5 分钟体验」一键填充演示数据，或打开「新手引导 / 协同助手」。</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleStartExperience()}>
            5 分钟体验
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowOnboarding(true)}>
            新手引导
          </button>
        </div>
      )}

      {page === 'auth' || !currentUser ? (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      ) : page === 'overview' ? (
        <main className="main overview-main">
          <OverviewHome
            metrics={metrics}
            pendingApprovalCount={pendingApprovalCount}
            agentCount={agents.length}
            runs={runs}
            onCreateRun={() => setShowCreate(true)}
            onNavigate={setPage}
            onOpenPendingTasks={handleGoPendingApproval}
            onStartExperience={() => void handleStartExperience()}
            onResumeExperience={handleResumeExperience}
            onViewExperienceSummary={() => setShowExperienceSummary(true)}
            experienceProgress={experienceProgress}
            experienceCompletedGroups={experienceCompletedGroups}
            showExperienceCard={IS_FRONTEND_DEMO}
            highlightPage={lastModulePage}
          />
        </main>
      ) : page === 'agents' ? (
        <AgentEditor />
      ) : page === 'tokens' ? (
        <TokenMonitor
          agents={agents}
          runs={runs}
          metrics={metrics}
          onConfigureAgent={() => setPage('agents')}
        />
      ) : page === 'ai' ? (
        <AiPlatform
          onUseModel={() => {
            setPage('agents');
          }}
        />
      ) : page === 'architecture' ? (
        <main className="main arch-main">
          <ArchitectureOverview onNavigate={setPage} metrics={metrics} />
        </main>
      ) : (
      <div className="layout">
        <aside className="sidebar" data-tour="workbench-sidebar">
          <div className="sidebar-head">
            <h2>我的任务</h2>
            <span className="count">{runs.length}</span>
            {pendingApprovalCount > 0 && (
              <span className="pending-badge" title="待验收修改方案">
                {pendingApprovalCount} 待验收
              </span>
            )}
          </div>
          <div className="sidebar-filter">
            <div className="filter-summary">
              <span>
                显示 {filteredRuns.length} / {runs.length}
              </span>
              {hasTaskFilters && (
                <button type="button" className="filter-clear" onClick={handleClearTaskFilters}>
                  清空
                </button>
              )}
            </div>
            <input
              type="search"
              placeholder="搜索标题、问题编号、验收标准或项目…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sidebar-search"
            />
            <div className="status-filter-chips" aria-label="任务状态筛选">
              {STATUS_FILTER_OPTIONS.map((item) => {
                const count = runs.filter((run) => matchesStatusFilter(run, item.key)).length;
                return (
                  <button
                    key={item.key || 'all'}
                    type="button"
                    className={statusFilter === item.key ? 'status-filter-chip active' : 'status-filter-chip'}
                    onClick={() => setStatusFilter(item.key)}
                  >
                    {item.label}
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>
            {agents.length > 1 && (
              <label className="filter-field">
                <span>智能体</span>
                <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
                  <option value="">全部智能体</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <ul className="run-list" data-tour="workbench-runs">
            {filteredRuns.length === 0 && (
              <li className="empty">
                {runs.length === 0 ? (
                  <EmptyState variant="tasks" title="还没有任务">
                    <strong>还没有任务</strong>
                    <span>写一段任务说明，智能体会生成修改方案，再交给你验收。</span>
                    <button type="button" className="btn btn-primary btn-sm empty-action" onClick={() => setShowCreate(true)}>
                      新建第一个任务
                    </button>
                  </EmptyState>
                ) : (
                  <EmptyState variant="search" title="没有匹配的任务">
                    <strong>没有匹配的任务</strong>
                    <span>调整搜索词、状态或智能体筛选。</span>
                    {hasTaskFilters && (
                      <button type="button" className="filter-clear empty-clear" onClick={handleClearTaskFilters}>
                        清空筛选
                      </button>
                    )}
                  </EmptyState>
                )}
              </li>
            )}
            {filteredRuns.map((run) => (
              <li
                key={run.id}
                className={`run-item${selectedId === run.id ? ' active' : ''}${run.status === 'needs_approval' ? ' run-item-pending' : ''}`}
                data-tour={run.status === 'needs_approval' ? 'workbench-pending-run' : undefined}
                onClick={() => setSelectedId(run.id)}
              >
                <div className="run-item-top">
                  <strong>{friendlyTaskTitle(run)}</strong>
                  <StatusBadge status={run.status} />
                </div>
                <div className="run-item-sub">
                  项目：{friendlyRepoName(run.input.repo)}
                  {run.input.issueNumber ? ` · 编号 #${run.input.issueNumber}` : ''}
                  {(() => {
                    const agent = agents.find((a) => a.id === run.agentId);
                    return agent ? ` · ${agent.name}` : '';
                  })()}
                </div>
                <div className="run-item-time">{formatTime(run.createdAt)}</div>
              </li>
            ))}
          </ul>
        </aside>

        <main className="main">
          {!selectedRun ? (
            <div className="workbench-empty">
              <EmptyState variant="tasks" title="工作台">
                <span className="section-kicker">工作台</span>
                <h2>{runs.length === 0 ? '还没有任务' : '选择一个任务查看详情'}</h2>
                <p>
                  {runs.length === 0
                    ? '从左侧或顶部新建任务，智能体会生成修改方案，并在交给你之前完成测试、预算与变更检查。'
                    : '左侧列表显示所有任务。待验收任务会自动置顶，进入详情后可查看任务说明、修改方案、验收、日志和操作记录。'}
                </p>
              </EmptyState>
              <WorkbenchFlowGuide hasRuns={runs.length > 0} pendingApprovalCount={pendingApprovalCount} />
              <div className="workbench-empty-actions">
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                  新建任务
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setPage('overview')}>
                  返回总览
                </button>
              </div>
            </div>
          ) : (
            <div className="task-detail">
              <div className="detail-header">
                <div>
                  <h2>{friendlyTaskTitle(selectedRun)}</h2>
                  <p className="detail-summary">{friendlySummary(selectedRun)}</p>
                  <p className="detail-meta">
                    项目：{friendlyRepoName(selectedRun.input.repo)}
                    {selectedRun.input.issueNumber ? ` · 问题 #${selectedRun.input.issueNumber}` : ''}
                    {selectedAgent && (
                      <>
                        {' '}
                        · 智能体：<strong>{selectedAgent.name}</strong>
                        {!devMode && (
                          <span className="detail-meta-sub">
                            {' '}
                            （{friendlyModelName(selectedAgent.spec.model)} ·{' '}
                            {selectedAgent.spec.skills?.length ?? selectedAgent.spec.tools.length} 个能力包）
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="detail-actions">
                  <StatusBadge status={selectedRun.status} />
                  {selectedRun.status === 'failed' && (
                    <button className="btn btn-primary" onClick={() => void handleRetry()}>
                      ↻ 重试任务
                    </button>
                  )}
                  {!['completed', 'failed', 'cancelled'].includes(selectedRun.status) &&
                    selectedRun.status !== 'needs_approval' && (
                    <button className="btn btn-ghost" onClick={() => void handleCancel()}>
                      取消任务
                    </button>
                  )}
                  {['completed', 'failed', 'cancelled'].includes(selectedRun.status) && (
                    <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => void handleDeleteRun()}>
                      删除记录
                    </button>
                  )}
                </div>
              </div>

              <ProgressBar status={selectedRun.status} />

              {selectedRun.status === 'failed' && selectedRun.errorMessage && (
                <div className="error-card">
                  <strong>失败原因</strong>
                  <p>{selectedRun.errorMessage}</p>
                </div>
              )}

              <section className="issue-card">
                <span className="section-kicker">任务说明</span>
                <h3>{friendlyTaskTitle(selectedRun)}</h3>
                <p className="issue-body">
                  {selectedRun.input.issueBody?.trim() ||
                    '（未填写详细说明，仅使用标题作为意图）'}
                </p>
                {selectedRun.input.acceptanceCriteria?.trim() && (
                  <div className="issue-acceptance">
                    <span className="issue-acceptance-label">验收标准</span>
                    <p className="issue-acceptance-body">{selectedRun.input.acceptanceCriteria}</p>
                  </div>
                )}
                {selectedRun.input.issueNumber != null && (
                  <p className="issue-meta-line">问题编号 #{selectedRun.input.issueNumber}</p>
                )}
                <div className="issue-meta">
                  <span>项目：{friendlyRepoName(selectedRun.input.repo)}</span>
                  {selectedAgent && <span>智能体：{selectedAgent.name}</span>}
                </div>
              </section>

              <section className="exec-summary-card">
                <span className="section-kicker">执行摘要</span>
                <p>{friendlySummary(selectedRun)}</p>
                <ul className="exec-summary-stats">
                  <li>状态：{STATUS_LABEL[selectedRun.status]}</li>
                  <li>用量：{selectedRun.tokensUsed.toLocaleString()} tokens</li>
                  <li>耗时：约 {formatRunDuration(selectedRun)}</li>
                </ul>
              </section>

              {selectedRun.output?.summary && (
                <section className="pr-card pr-card-draft">
                  <div className="pr-card-head">
                    <span className="section-kicker">修改方案预览</span>
                    {selectedRun.status === 'needs_approval' && (
                      <span className="draft-pr-badge">待验收</span>
                    )}
                  </div>
                  <p className="pr-desc pr-desc-multiline">{selectedRun.output.summary}</p>
                  {selectedRun.output.revisionApplied && (
                    <p className="pr-revision-tag">已纳入验收意见：{selectedRun.output.revisionApplied}</p>
                  )}
                  {selectedRun.output.attempt != null && selectedRun.output.attempt > 1 && (
                    <p className="pr-attempt-tag">第 {selectedRun.output.attempt} 轮执行结果</p>
                  )}
                  {hasRoundComparison(selectedRun) && <RoundCompare run={selectedRun} compact />}
                  {selectedRun.output.branch && (
                    <p className="pr-preview-meta">
                      分支：<code>{selectedRun.output.branch}</code>
                      {selectedRun.output.prUrl && devMode && (
                        <>
                          {' '}
                          · <code>{selectedRun.output.prUrl}</code>
                        </>
                      )}
                    </p>
                  )}
                  <div className="changed-files">
                    <strong>变更文件（{buildMockChangedFiles(selectedRun).length}）</strong>
                    <ul>
                      {buildMockChangedFiles(selectedRun).map((file) => (
                        <li key={file}>
                          <code>{file}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button type="button" className="btn btn-ghost pr-preview-btn" onClick={() => setShowPrPreview(true)}>
                    查看完整代码差异 →
                  </button>
                </section>
              )}

              {selectedRun.gateChecks && (
                <GatePrecheck
                  checks={selectedRun.gateChecks}
                  variant={selectedRun.status === 'needs_approval' ? 'passed' : 'failed'}
                />
              )}

              {selectedRun.status === 'needs_approval' && (
                <div data-tour="approval-gate">
                  <ApprovalGate
                    onApprove={() => handleApprove()}
                    onReject={(reason) => handleReject(reason)}
                    onRevise={(notes) => handleRevise(notes)}
                  />
                </div>
              )}

              {auditEvents.length > 0 && (
                <section className="audit-section">
                  <h3>操作记录</h3>
                  <p className="logs-desc">验收决定与状态变化都会记录，方便之后复盘</p>
                  <AuditTimeline events={auditEvents} />
                </section>
              )}

              {selectedRun.status === 'completed' && (
                <div className="audit-card">
                  <strong>验收摘要</strong>
                  <ul>
                    <li>验收结果：{friendlyCompletionGate(selectedRun)}</li>
                    <li>耗时：约 {formatRunDuration(selectedRun)}</li>
                    <li>用量：{selectedRun.tokensUsed.toLocaleString()} tokens</li>
                    {selectedAgent && <li>智能体：{selectedAgent.name}</li>}
                  </ul>
                </div>
              )}

              {devMode && (
                <div className="meta-row">
                  <span>
                    任务 ID：<code>{selectedRun.id}</code>
                  </span>
                  <span>消耗用量：{selectedRun.tokensUsed.toLocaleString()} tokens</span>
                  <span>流程：{selectedRun.workflow}</span>
                </div>
              )}

              <section className="logs">
                <div className="logs-head">
                  <div>
                    <h3>{devMode ? '技术日志' : '执行过程'}</h3>
                    <p className="logs-desc">
                      {devMode ? '原始日志流（含工具名与英文 message）' : 'AI 执行步骤的简要记录，可展开查看'}
                    </p>
                  </div>
                  {!['pending', 'queued', 'provisioning', 'running', 'pr_opened'].includes(selectedRun.status) && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setLogsExpanded((v) => !v)}
                    >
                      {logsExpanded ? '收起' : '展开'}
                    </button>
                  )}
                </div>
                {logsExpanded && (
                  <div className="log-panel">
                    {logs.map((log) => (
                      <div key={log.id} className={`log-line log-${log.level}`}>
                        <span className="log-ts">{formatTime(log.ts)}</span>
                        {devMode && log.level === 'step' && typeof log.meta?.tool === 'string' && (
                          <span className="log-tool">{log.meta.tool}</span>
                        )}
                        {!devMode && log.level === 'step' && typeof log.meta?.tool === 'string' && (
                          <span className="log-tool">{friendlyToolName(log.meta.tool)}</span>
                        )}
                        <span>{devMode ? log.message : friendlyLogMessage(log)}</span>
                      </div>
                    ))}
                    {logs.length === 0 && <div className="log-empty">正在等待第一条记录…</div>}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
      )}

      {showPrPreview && selectedRun?.output && (
        <div className="modal-backdrop" onClick={() => setShowPrPreview(false)}>
          <div className="modal modal-wide pr-preview-modal" onClick={(e) => e.stopPropagation()}>
            <h2>修改方案预览</h2>
            <p className="modal-note">这里展示变更文件和代码差异。确认结果请回到工作台选择：通过、要求修改或打回。</p>
            {selectedRun.output.summary && <p className="pr-preview-summary">{selectedRun.output.summary}</p>}
            {selectedRun.output.branch && (
              <p className="pr-preview-meta">
                分支：<code>{selectedRun.output.branch}</code>
              </p>
            )}
            <div className="changed-files changed-files-modal">
              <strong>变更文件</strong>
              <ul>
                {buildMockChangedFiles(selectedRun).map((file) => (
                  <li key={file}>
                    <code>{file}</code>
                  </li>
                ))}
              </ul>
            </div>
            {hasRoundComparison(selectedRun) && <RoundCompare run={selectedRun} />}
            <pre className="pr-preview-diff">{buildMockDiff(selectedRun)}</pre>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowPrPreview(false)}>
                关闭
              </button>
              {selectedRun.status === 'needs_approval' && (
                <>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => void handleApprove().then(() => setShowPrPreview(false))}
                  >
                    ✓ 通过
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowPrPreview(false)}>
                    返回工作台验收
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <form className="modal modal-wide" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void handleCreate(e)}>
            <h2>新建任务</h2>
            <WorkflowGuide compact />
            <section className="modal-section">
              <div className="modal-section-head">
                <span>01</span>
                <strong>执行配置</strong>
              </div>
              <div className="modal-field-row">
                {agents.length > 0 && (
                  <label>
                    使用智能体
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  项目名称
                  <input
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="例如：我的团队/网站项目"
                    required
                  />
                  <span className="field-hint">格式类似「组织名/项目名」</span>
                </label>
              </div>
            </section>

            <section className="modal-section">
              <div className="modal-section-head">
                <span>02</span>
                <strong>任务说明</strong>
              </div>
              <div className="modal-field-row modal-field-row-compact">
                <label>
                  问题编号（可选）
                  <input value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} placeholder="42" />
                </label>
                <label>
                  问题标题
                  <input
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="例如：登录按钮点击后没反应"
                    required
                  />
                </label>
              </div>
              <label>
                问题详情
                <textarea
                  value={issueBody}
                  onChange={(e) => setIssueBody(e.target.value)}
                  rows={4}
                  placeholder="补充复现步骤、期望行为、约束条件…"
                />
                <span className="field-hint">你写得越清楚，智能体越容易一次改对</span>
              </label>
            </section>

            <section className="modal-section">
              <div className="modal-section-head">
                <span>03</span>
                <strong>验收标准</strong>
              </div>
              <label>
                验收标准
                <textarea
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  rows={3}
                  placeholder="例如：测试通过、有错误提示、不改无关文件…"
                />
                <span className="field-hint">会写入修改摘要和操作记录，验收时可以逐条对照</span>
              </label>
            </section>
            {createBudgetStatus === 'warn' && (
              <p className="modal-warn">该智能体本月用量已超过 80%，继续创建可能很快达到上限。</p>
            )}
            {createBudgetStatus === 'exceeded' && (
              <p className="modal-warn modal-warn-stop">该智能体本月预算已用尽，请调整预算或换智能体。</p>
            )}
            <p className="modal-note">
              提交后将自动执行：读代码 → 修改 → 测试 → 验收前检查 → 修改方案待验收。标题或详情含「测试失败」可复现测试不通过场景。
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || createBudgetStatus === 'exceeded'}
              >
                {loading ? '提交中…' : '开始处理'}
              </button>
            </div>
          </form>
        </div>
      )}

      {currentUser && showExperienceTour && (
        <DemoExperienceTour
          key={experienceTourStartIndex}
          pendingRunId={experiencePendingRunId}
          pendingRunApproved={experiencePendingApproved}
          initialStepIndex={experienceTourStartIndex}
          onNavigate={setPage}
          onFocusPendingRun={handleFocusExperienceRun}
          onProgressUpdate={bumpExperienceProgress}
          onClose={() => setShowExperienceTour(false)}
          onComplete={() => {
            bumpExperienceProgress();
            setShowExperienceSummary(true);
          }}
        />
      )}

      {currentUser && showExperienceSummary && (
        <ExperienceSummary
          metrics={experienceSummaryMetrics}
          onClose={() => setShowExperienceSummary(false)}
          onGoApprove={() => {
            setShowExperienceSummary(false);
            handleGoPendingApproval();
          }}
          onCreateTask={() => {
            setShowExperienceSummary(false);
            setPage('tasks');
            setShowCreate(true);
          }}
          onOpenOnboarding={() => {
            setShowExperienceSummary(false);
            setShowOnboarding(true);
          }}
          onOpenAi={() => {
            setShowExperienceSummary(false);
            setAiPlatformTab('models');
            setPage('ai');
          }}
          onRestartExperience={() => {
            setShowExperienceSummary(false);
            void handleStartExperience();
          }}
        />
      )}

      {currentUser && showOnboarding && (
        <OnboardingGuide onNavigate={setPage} onClose={() => setShowOnboarding(false)} />
      )}

      {currentUser && !presentationMode && (
        <AssistantPanel context={assistantContext} onAction={handleAssistantAction} />
      )}
    </div>
  );
}
