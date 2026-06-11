import type { LogEntry, Run, RunStatus } from './api';

/** 面向普通用户的状态文案 */
export const STATUS_LABEL: Record<RunStatus, string> = {
  pending: '刚提交',
  queued: '排队中',
  provisioning: '准备中',
  running: 'AI 修改中',
  pr_opened: '方案已生成',
  needs_approval: 'Draft PR 待验收',
  completed: '已完成',
  failed: '出错了',
  cancelled: '已取消',
};

export const STATUS_HINT: Partial<Record<RunStatus, string>> = {
  pending: '任务已收到，马上开始处理',
  queued: '前面还有别的任务，请稍等',
  provisioning: '正在准备运行环境',
  running: 'AI 正在读代码、改代码、跑测试',
  pr_opened: 'Draft PR 已生成',
  needs_approval: '请验收 Draft PR：通过、打回或要求修改',
  completed: '这个任务已经处理完毕',
  failed: '处理过程中遇到问题，可以重试或取消',
  cancelled: '这个任务已被取消',
};

/** 5 步进度条 — 普通人一眼能看懂 */
export const PROGRESS_STEPS = [
  { key: 'submit', label: '提交任务' },
  { key: 'queue', label: '排队等待' },
  { key: 'work', label: 'AI 工作中' },
  { key: 'review', label: 'Draft PR 验收' },
  { key: 'done', label: '完成' },
] as const;

export function progressStepIndex(status: RunStatus): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'queued':
      return 1;
    case 'provisioning':
    case 'running':
    case 'pr_opened':
      return 2;
    case 'needs_approval':
      return 3;
    case 'completed':
    case 'failed':
    case 'cancelled':
      return 4;
    default:
      return 0;
  }
}

export function isProgressDone(status: RunStatus, stepIndex: number): boolean {
  const current = progressStepIndex(status);
  if (status === 'failed' || status === 'cancelled') {
    return stepIndex < 4;
  }
  return stepIndex < current;
}

export function isProgressActive(status: RunStatus, stepIndex: number): boolean {
  return progressStepIndex(status) === stepIndex && !['completed', 'failed', 'cancelled'].includes(status);
}

/** 把英文/技术日志翻成大白话 */
export function friendlyLogMessage(log: LogEntry): string {
  const msg = log.message;
  const agentName = typeof log.meta?.agentName === 'string' ? log.meta.agentName : null;

  if (msg.startsWith('Run created for ')) {
    const repo = msg.replace('Run created for ', '');
    return agentName
      ? `任务已创建，智能体「${agentName}」开始处理项目「${repo}」`
      : `任务已创建，开始处理项目「${repo}」`;
  }
  if (msg.startsWith('Agent ') && msg.includes(' assigned')) {
    const name = msg.replace('Agent ', '').replace(' assigned', '');
    return `已分配智能体「${name}」`;
  }
  if (msg.startsWith('Cloning ')) {
    const repo = msg.replace('Cloning ', '').replace('...', '');
    return `正在下载项目「${repo}」的代码…`;
  }
  if (msg.includes('Reading issue context')) return '正在阅读问题描述和相关代码';
  if (msg.includes('Applying fix')) return '正在修改代码文件';
  if (msg.includes('Running npm test')) return '正在运行自动化测试';
  if (msg.includes('All tests passed')) return '测试全部通过 ✓';
  if (msg.includes('Tests failed')) return '自动化测试未通过 ✕';
  if (msg.includes('Gate pre-check passed')) return 'Gate 前检查全部通过，等待你验收';
  if (msg.startsWith('Blocked unauthorized tool')) {
    const tool = typeof log.meta?.tools === 'object' && Array.isArray(log.meta.tools) ? log.meta.tools[0] : '';
    return tool ? `运行时拦截未授权 Tool：${tool}` : '运行时拦截未授权 Tool';
  }
  if (msg.startsWith('Draft PR opened')) return '已生成修改方案（草稿），可以预览';
  if (msg.includes('Fix applied locally')) return '修改已写入本地分支（未启用开 PR 工具）';
  if (msg.includes('Calling Anthropic')) return '正在调用大模型生成修复方案…';
  if (msg.includes('LLM plan ready')) return '大模型方案已生成';
  if (msg.startsWith('GitHub repo verified')) return '已验证 GitHub 仓库访问权限';
  if (msg.startsWith('Posted plan comment')) return '已在 Issue 下回复 agentOS 方案评论';
  if (msg.includes('Waiting for human approval')) return 'Draft PR 已就绪，等待你验收';
  if (msg === 'Gate approved — task completed') return '验收通过，任务完成 ✓';
  if (msg === 'Approved — task completed') return '验收通过，任务完成 ✓';
  if (msg.startsWith('Gate reject — re-queued')) return '验收打回，任务已重新排队执行';
  if (msg.includes('Addressing reviewer feedback')) {
    const notes = typeof log.meta?.revisionNotes === 'string' ? log.meta.revisionNotes : '';
    return notes ? `正在按验收意见修改：${notes}` : '正在按验收意见修改代码';
  }
  if (msg.startsWith('Revision requested:')) return `已收到修改要求：${msg.replace('Revision requested: ', '')}`;
  if (msg.includes('Applying revision notes')) return '智能体正在按你的修改要求重新执行…';
  if (msg === 'Run cancelled by user') return '任务已由你取消';

  const statusMatch = msg.match(/^Status: (\w+) → (\w+)/);
  if (statusMatch) {
    const from = STATUS_LABEL[statusMatch[1] as RunStatus] ?? statusMatch[1];
    const to = STATUS_LABEL[statusMatch[2] as RunStatus] ?? statusMatch[2];
    return `进度更新：${from} → ${to}`;
  }

  return msg;
}

export function friendlyToolName(tool: string): string {
  const map: Record<string, string> = {
    read_file: '读代码',
    write_file: '改代码',
    shell: '跑命令',
    run_tests: '测一测',
    open_draft_pr: '开 PR',
  };
  return map[tool] ?? tool;
}

export function friendlyRepoName(repo: string): string {
  return repo.includes('/') ? repo.split('/').pop() ?? repo : repo;
}

export function friendlyTaskTitle(run: Run): string {
  return run.input.issueTitle ?? '自动修复任务';
}

export function friendlySummary(run: Run): string {
  if (run.status === 'needs_approval') {
    return 'AI 已提交 Draft PR，请先看 Issue 与变更摘要，再决定通过、打回或要求修改。';
  }
  if (run.status === 'completed') {
    return '你已验收通过，任务完成。';
  }
  if (run.status === 'failed') {
    return run.errorMessage ?? '任务执行失败，请联系管理员或重试。';
  }
  if (run.status === 'cancelled') {
    return '任务已取消。';
  }
  if (['pending', 'queued', 'provisioning'].includes(run.status)) {
    return '任务已提交，系统正在排队并准备环境。';
  }
  return 'AI 正在自动处理问题，请稍等…';
}

const AUDIT_LABELS: Record<string, string> = {
  'run.created': '任务已创建',
  'reconcile.transition': '状态变更',
  'pr.opened': 'Draft PR 已生成',
  'run.approved': '验收通过',
  'run.rejected': '验收打回（旧）',
  'run.reject_retry': '打回重做',
  'run.revision_requested': '要求修改',
  'run.cancelled': '任务已取消',
  'run.failed': '任务执行失败',
  'run.retried': '任务已重试',
  'github.comment': 'GitHub Issue 已评论',
  'skill.resolved': 'Skill 工具白名单已解析',
  'tests.failed': '自动化测试失败',
  'gate.precheck_passed': 'Gate 前检查通过',
  'run.round_archived': '上一轮结果已归档',
  'tool.intercepted': '越权 Tool 已拦截',
};

export function friendlyAuditPayload(event: { type: string; payload?: Record<string, unknown> }): string | null {
  const p = event.payload;
  if (!p) return null;
  switch (event.type) {
    case 'reconcile.transition':
      if (typeof p.from === 'string' && typeof p.to === 'string') {
        const from = STATUS_LABEL[p.from as RunStatus] ?? p.from;
        const to = STATUS_LABEL[p.to as RunStatus] ?? p.to;
        return `${from} → ${to}${typeof p.reason === 'string' ? `（${p.reason}）` : ''}`;
      }
      break;
    case 'pr.opened':
      if (Array.isArray(p.changedFiles)) return `变更 ${p.changedFiles.length} 个文件`;
      break;
    case 'run.approved':
      return 'Gate：通过';
    case 'run.rejected':
    case 'run.reject_retry':
      return typeof p.reason === 'string' ? `原因：${p.reason}` : 'Gate：打回重做';
    case 'run.revision_requested':
      return typeof p.notes === 'string' ? `修改要求：${p.notes}` : null;
    case 'skill.resolved':
      if (Array.isArray(p.tools)) return `Tools：${(p.tools as string[]).join(', ')}`;
      break;
    case 'tests.failed':
      return typeof p.hint === 'string' ? p.hint : '测试未通过，任务终止';
    case 'gate.precheck_passed':
      return '测试 · 变更 · 预算 · PR 全部就绪';
    case 'run.failed':
      if (Array.isArray(p.gateChecks)) return (p.gateChecks as string[]).join('；');
      break;
    case 'run.created':
      if (typeof p.acceptanceCriteria === 'string' && p.acceptanceCriteria) {
        return `验收标准：${p.acceptanceCriteria}`;
      }
      break;
    case 'run.round_archived':
      return typeof p.attempt === 'number'
        ? `第 ${p.attempt} 轮已存档（${p.trigger === 'revise' ? '要求修改' : '打回重做'}）`
        : null;
    case 'tool.intercepted':
      if (Array.isArray(p.tools)) return `拦截：${(p.tools as string[]).join(', ')}`;
      break;
  }
  return null;
}

export function friendlyAuditLabel(type: string): string {
  return AUDIT_LABELS[type] ?? type;
}

export function friendlyModelName(model: string): string {
  const map: Record<string, string> = {
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-opus-4-20250514': 'Claude Opus 4',
    'gpt-4.1': 'GPT-4.1',
    'gpt-4.1-mini': 'GPT-4.1 Mini',
  };
  return map[model] ?? model;
}

/** 演示用：根据任务生成模拟 diff */
export function buildMockChangedFiles(run: Run): string[] {
  if (run.output?.changedFiles?.length) return run.output.changedFiles;
  const primary = run.input.issueTitle?.includes('登录') ? 'src/auth/login.ts' : 'src/handler.ts';
  return [primary, primary.replace(/\.ts$/, '.test.ts')];
}

export function buildMockDiff(run: Run): string {
  const title = run.input.issueTitle ?? '修复问题';
  const file = buildMockChangedFiles(run)[0] ?? 'src/handler.ts';
  const attempt = run.output?.attempt ?? run.runAttempt ?? 1;
  const revisionBlock = run.output?.revisionApplied
    ? `
@@ -24,6 +24,9 @@ export async function handleRequest(req: Request) {
+  // Reviewer: ${run.output.revisionApplied}
+  showLoginErrorToast('登录失败，请重试');
`
    : '';
  const roundBlock =
    attempt > 1
      ? `
@@ -1,0 +1,8 @@
+// Round ${attempt} changes
+${run.pendingRevision || run.output?.revisionApplied ? '+// Addressed reviewer feedback' : '+// Rework after gate reject'}
`
      : '';
  return `--- a/${file}
+++ b/${file}
@@ -18,6 +18,12 @@ export async function handleRequest(req: Request) {
-  // TODO: ${title}
+  // Fix: ${title}
+  if (!session?.userId) {
+    return Response.json({ error: '请先登录' }, { status: 401 });
+  }
+  await trackEvent('fix_applied', { issue: ${run.input.issueNumber ?? 0} });
   return processRequest(req);
 }
${revisionBlock}
@@ -42,7 +48,7 @@ export async function runChecks() {
-  expect(result).toBeUndefined();
+  expect(result).toEqual({ ok: true });
 }
${roundBlock}`;
}

export function friendlyCompletionGate(run: Run): string {
  if (run.status !== 'completed') return '';
  if (run.completionGate === 'revise') return '经修改后验收通过';
  return '首次验收通过';
}

export function formatRunDuration(run: Run): string {
  const start = new Date(run.createdAt).getTime();
  const end = new Date(run.updatedAt).getTime();
  const seconds = Math.max(1, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}
