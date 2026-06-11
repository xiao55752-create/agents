import { useCallback, useEffect, useRef, useState } from 'react';
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
  getAgentBudgetStatus,
  exportDemoData,
  importDemoData,
  IS_FRONTEND_DEMO,
  rejectRun,
  resetDemoData,
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
import { PlatformOverview } from './PlatformOverview';
import { AgentEditor } from './AgentEditor';
import { ArchitectureOverview } from './architecture/ArchitectureOverview';
import type { Page } from './architecture/types';

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
  const [page, setPage] = useState<Page>('tasks');
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

  const selectedAgent = selectedRun ? agents.find((a) => a.id === selectedRun.agentId) : null;
  const pendingApprovalCount = runs.filter((r) => r.status === 'needs_approval').length;
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

  async function handleResetDemo() {
    if (!window.confirm('清空所有本地数据（任务、智能体恢复默认）？此操作不可撤销。')) return;
    await resetDemoData();
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

  const hasTaskFilters = Boolean(statusFilter || searchQuery.trim() || agentFilter);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">⬡</span>
          <div>
            <h1>agentOS</h1>
            <p>Issue 驱动 · Skill 编排 · Draft PR · Human Gate</p>
          </div>
        </div>
        <div className="header-actions">
          <nav className="nav-tabs">
            <button
              type="button"
              className={page === 'tasks' ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setPage('tasks')}
            >
              任务
            </button>
            <button
              type="button"
              className={page === 'agents' ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setPage('agents')}
            >
              智能体
            </button>
            <button
              type="button"
              className={page === 'architecture' ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setPage('architecture')}
            >
              架构
            </button>
          </nav>
          <label className="dev-toggle">
            <input type="checkbox" checked={devMode} onChange={(e) => setDevMode(e.target.checked)} />
            开发者视图
          </label>
          {page === 'tasks' && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + 新建任务
            </button>
          )}
        </div>
      </header>

      {integrations && (
        <div className={`integration-bar integration-${integrations.mode}`}>
          {IS_FRONTEND_DEMO ? (
            <>
              <span>本地模式 — 数据保存在浏览器{page === 'agents' ? '（含智能体配置）' : ''}</span>
              <div className="integration-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleExportDemo()}>
                  导出 JSON
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => importInputRef.current?.click()}>
                  导入 JSON
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={() => void handleResetDemo()}>
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

      {page === 'agents' ? (
        <AgentEditor />
      ) : page === 'architecture' ? (
        <main className="main arch-main">
          <ArchitectureOverview onNavigate={setPage} metrics={metrics} />
        </main>
      ) : (
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-head">
            <h2>我的任务</h2>
            <span className="count">{runs.length}</span>
            {pendingApprovalCount > 0 && (
              <span className="pending-badge" title="待验收 Draft PR">
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
              placeholder="搜索标题、Issue、验收标准或项目…"
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
          <ul className="run-list">
            {filteredRuns.length === 0 && (
              <li className="empty">
                {runs.length === 0 ? (
                  <>
                    <strong>还没有任务</strong>
                    <span>点右上角「新建任务」开始。</span>
                  </>
                ) : (
                  <>
                    <strong>没有匹配的任务</strong>
                    <span>调整搜索词、状态或智能体筛选。</span>
                    {hasTaskFilters && (
                      <button type="button" className="filter-clear empty-clear" onClick={handleClearTaskFilters}>
                        清空筛选
                      </button>
                    )}
                  </>
                )}
              </li>
            )}
            {filteredRuns.map((run) => (
              <li
                key={run.id}
                className={`run-item${selectedId === run.id ? ' active' : ''}${run.status === 'needs_approval' ? ' run-item-pending' : ''}`}
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
            <div className="welcome">
              <PlatformOverview
                variant="welcome"
                metrics={metrics}
                pendingApprovalCount={pendingApprovalCount}
                onNavigate={setPage}
              />
              <WorkflowGuide />

              <div className="welcome-footer">
                <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
                  新建任务
                </button>
                <p className="hint">
                  填写 Issue 标题与详情，选择智能体，AI 将生成 Draft PR 并进入 Gate 待你验收。
                  {pendingApprovalCount > 0 && ` · 当前有 ${pendingApprovalCount} 个任务待验收`}
                  {devMode && ` · 默认智能体：${agents[0]?.name ?? 'issue-fix-agent'}`}
                </p>
                <button type="button" className="btn btn-ghost btn-sm welcome-arch-link" onClick={() => setPage('architecture')}>
                  查看三页功能与架构对照 →
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
                            {selectedAgent.spec.skills?.length ?? selectedAgent.spec.tools.length} 个 Skill）
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
                <span className="section-kicker">意图 · Issue</span>
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
                  <p className="issue-meta-line">Issue #{selectedRun.input.issueNumber}</p>
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
                  <li>Token：{selectedRun.tokensUsed.toLocaleString()}</li>
                  <li>耗时：约 {formatRunDuration(selectedRun)}</li>
                </ul>
              </section>

              {selectedRun.output?.summary && (
                <section className="pr-card pr-card-draft">
                  <div className="pr-card-head">
                    <span className="section-kicker">Draft PR 预览</span>
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
                    查看完整 diff →
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
                <ApprovalGate
                  onApprove={() => handleApprove()}
                  onReject={(reason) => handleReject(reason)}
                  onRevise={(notes) => handleRevise(notes)}
                />
              )}

              {auditEvents.length > 0 && (
                <section className="audit-section">
                  <h3>审计轨迹</h3>
                  <p className="logs-desc">不可变事件记录，Gate 决策与状态变更可追溯</p>
                  <AuditTimeline events={auditEvents} />
                </section>
              )}

              {selectedRun.status === 'completed' && (
                <div className="audit-card">
                  <strong>验收摘要</strong>
                  <ul>
                    <li>Gate：{friendlyCompletionGate(selectedRun)}</li>
                    <li>耗时：约 {formatRunDuration(selectedRun)}</li>
                    <li>Token：{selectedRun.tokensUsed.toLocaleString()}</li>
                    {selectedAgent && <li>智能体：{selectedAgent.name}</li>}
                  </ul>
                </div>
              )}

              {devMode && (
                <div className="meta-row">
                  <span>
                    任务 ID：<code>{selectedRun.id}</code>
                  </span>
                  <span>消耗 Token：{selectedRun.tokensUsed.toLocaleString()}</span>
                  <span>流程：{selectedRun.workflow}</span>
                </div>
              )}

              <section className="logs">
                <div className="logs-head">
                  <div>
                    <h3>{devMode ? '技术日志' : '执行过程'}</h3>
                    <p className="logs-desc">
                      {devMode ? '原始日志流（含工具名与英文 message）' : 'AI 执行步骤的简要记录（验收时可折叠）'}
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
            <h2>Draft PR 预览</h2>
            <p className="modal-note">变更文件与 diff 摘要。验收请在任务页使用 Gate：通过 / 要求修改 / 打回。</p>
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
                    返回任务页验收
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
                <strong>Issue 意图</strong>
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
                问题详情（意图）
                <textarea
                  value={issueBody}
                  onChange={(e) => setIssueBody(e.target.value)}
                  rows={4}
                  placeholder="补充复现步骤、期望行为、约束条件…"
                />
                <span className="field-hint">10-80-10 的前 10%：写清楚意图，AI 才容易改对</span>
              </label>
            </section>

            <section className="modal-section">
              <div className="modal-section-head">
                <span>03</span>
                <strong>Gate 验收标准</strong>
              </div>
              <label>
                验收标准（KPI）
                <textarea
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  rows={3}
                  placeholder="例如：测试通过、有错误提示、不改无关文件…"
                />
                <span className="field-hint">将写入 PR 摘要与审计，供 Gate 验收时对照</span>
              </label>
            </section>
            {createBudgetStatus === 'warn' && (
              <p className="modal-warn">该智能体本月 Token 已用超过 80%，继续创建可能很快触顶。</p>
            )}
            {createBudgetStatus === 'exceeded' && (
              <p className="modal-warn modal-warn-stop">该智能体本月预算已用尽，请调整预算或换智能体。</p>
            )}
            <p className="modal-note">
              提交后将自动执行：读代码 → 修改 → 测试 → Gate 前检查 → Draft PR 待验收。标题或详情含「测试失败」可复现测试不通过场景。
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
    </div>
  );
}
