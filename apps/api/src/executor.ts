import type { AgentSpec, RunRecord } from '@agentos/shared';
import { resolveAgentTools } from '@agentos/shared';
import { appendAudit, appendLog, getAgent, getRun, getRunVersion, updateRunCas } from './db.js';
import { getIntegrations } from './config.js';
import { postIssueComment, verifyRepoAccess } from './github.js';
import { runLlmPlan } from './llm.js';
import { enqueueReconcile } from './reconcile.js';

const executionQueue: string[] = [];
let executing = false;

export function enqueueExecution(runId: string) {
  if (!executionQueue.includes(runId)) {
    executionQueue.push(runId);
  }
  void drainExecutionQueue();
}

async function drainExecutionQueue() {
  if (executing) return;
  executing = true;
  try {
    while (executionQueue.length > 0) {
      const runId = executionQueue.shift()!;
      await executeRun(runId);
    }
  } finally {
    executing = false;
  }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function transition(runId: string, status: Parameters<typeof updateRunCas>[2]['status']) {
  const version = getRunVersion(runId);
  const ok = updateRunCas(runId, version, { status });
  if (!ok) throw new Error('CAS failed');
  enqueueReconcile(runId);
}

async function simulateSteps(runId: string, agentSpec: AgentSpec) {
  const tools = new Set(resolveAgentTools(agentSpec));
  const steps: Array<{ tool: string; msg: string }> = [];
  if (tools.has('read_file')) {
    steps.push({ tool: 'read_file', msg: 'Reading issue context and relevant source files' });
  }
  if (tools.has('write_file')) {
    steps.push({ tool: 'write_file', msg: 'Applying fix to src/handler.ts' });
  }
  if (tools.has('shell') || tools.has('run_tests')) {
    steps.push({ tool: tools.has('run_tests') ? 'run_tests' : 'shell', msg: 'Running npm test' });
  }
  if (tools.has('run_tests') || tools.has('shell')) {
    steps.push({ tool: 'run_tests', msg: 'All tests passed (simulated)' });
  }
  for (const step of steps) {
    await sleep(700);
    appendLog(runId, 'step', step.msg, { tool: step.tool });
  }
}

function defaultSummary(run: RunRecord): string {
  return `Fix: ${run.input.issueTitle ?? 'automated change'} (simulated)`;
}

async function executeRun(runId: string) {
  const run = getRun(runId);
  if (!run) return;

  const integrations = getIntegrations();
  const agent = getAgent(run.agentId);
  if (!agent) {
    updateRunCas(runId, getRunVersion(runId), {
      status: 'failed',
      errorMessage: 'Agent not found',
    });
    return;
  }

  try {
    await sleep(400);
    appendLog(runId, 'info', `Cloning ${run.input.repo}...`, {
      mode: integrations.mode,
    });
    await transition(runId, 'running');

    let summary = defaultSummary(run);
    let tokensUsed = 12400 + Math.floor(Math.random() * 3000);
    let executionNote = 'MVP simulated';

    if (integrations.llm === 'anthropic') {
      appendLog(runId, 'info', 'Calling Anthropic API with agent system prompt...');
      const llm = await runLlmPlan(agent.spec, run.input);
      for (const step of llm.steps) {
        await sleep(400);
        appendLog(runId, 'step', step.message, { tool: step.tool, source: 'llm' });
      }
      summary = llm.summary;
      tokensUsed = llm.tokensUsed;
      executionNote = 'LLM-generated plan';
      appendLog(runId, 'info', `LLM plan ready (${tokensUsed} tokens)`, { source: 'llm' });
    } else {
      await simulateSteps(runId, agent.spec);
    }

    const branch = `agentos/run-${runId.slice(4, 12)}`;
    let prUrl = `https://github.com/${run.input.repo}/pull/999`;

    if (integrations.github === 'enabled') {
      const ok = await verifyRepoAccess(run.input.repo);
      if (ok) {
        appendLog(runId, 'info', `GitHub repo verified: ${run.input.repo}`);
        if (run.input.issueNumber) {
          const comment = await postIssueComment({
            repo: run.input.repo,
            issueNumber: run.input.issueNumber,
            body: [
              '### 🤖 agentOS Draft Plan',
              '',
              `**Summary:** ${summary}`,
              '',
              `**Branch:** \`${branch}\` (draft — merge after approval)`,
              '',
              `**Mode:** ${executionNote}`,
              '',
              '_Reply with feedback; agentOS v0.2 will resume on CI/review loops._',
            ].join('\n'),
          });
          appendLog(runId, 'info', `Posted plan comment on issue #${run.input.issueNumber}`, {
            commentUrl: comment.url,
          });
          appendAudit(runId, 'github.comment', { url: comment.url });
        }
      } else {
        appendLog(runId, 'warn', `GitHub repo not accessible: ${run.input.repo} — using simulated PR URL`);
      }
    }

    updateRunCas(runId, getRunVersion(runId), {
      status: 'pr_opened',
      output: { prUrl, branch, summary },
      tokensUsed,
    });
    appendLog(runId, 'info', `Draft PR opened: ${prUrl}`, { branch, executionNote });
    appendAudit(runId, 'pr.opened', { prUrl, branch, executionNote });

    await sleep(300);
    await transition(runId, 'needs_approval');
    appendLog(runId, 'info', 'Waiting for human approval');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    updateRunCas(runId, getRunVersion(runId), {
      status: 'failed',
      errorMessage: message,
    });
    appendLog(runId, 'error', message);
    appendAudit(runId, 'run.failed', { message });
  }
}
