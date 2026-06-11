import {
  reconcileRun,
  TERMINAL_STATUSES,
  type ReconcileAction,
  type RunRecord,
  type WorldSnapshot,
} from '@agentos/shared';
import {
  appendAudit,
  appendLog,
  countActiveExecutions,
  getRun,
  getRunVersion,
  listNonTerminalRuns,
  MAX_CONCURRENT,
  updateRunCas,
} from './db.js';
import { enqueueExecution } from './executor.js';

const reconcileQueue = new Set<string>();
let processing = false;

export function enqueueReconcile(runId: string) {
  reconcileQueue.add(runId);
  void drainReconcileQueue();
}

async function drainReconcileQueue() {
  if (processing) return;
  processing = true;
  try {
    while (reconcileQueue.size > 0) {
      const [runId] = reconcileQueue;
      reconcileQueue.delete(runId!);
      await reconcileOnce(runId!);
    }
  } finally {
    processing = false;
    if (reconcileQueue.size > 0) void drainReconcileQueue();
  }
}

function buildSnapshot(run: RunRecord): WorldSnapshot {
  return {
    run,
    now: new Date().toISOString(),
    runnerAvailable: countActiveExecutions() < MAX_CONCURRENT,
    readErrors: [],
  };
}

async function reconcileOnce(runId: string) {
  const run = getRun(runId);
  if (!run) return;
  if (TERMINAL_STATUSES.includes(run.status)) return;

  const action = reconcileRun(buildSnapshot(run));
  await executeAction(run, action);
}

async function executeAction(run: RunRecord, action: ReconcileAction) {
  const version = getRunVersion(run.id);

  switch (action.type) {
    case 'noop':
      console.log(`[reconcile] noop run=${run.id} reason=${action.reason}`);
      return;

    case 'defer': {
      const ok = updateRunCas(run.id, version, {
        reconcileBackoffUntil: action.until,
        reconcileAttempts: run.reconcileAttempts + 1,
      });
      console.log(`[reconcile] defer run=${run.id} ok=${ok} reason=${action.reason}`);
      return;
    }

    case 'transition': {
      const patch: Parameters<typeof updateRunCas>[2] = {
        status: action.to,
        controlIntent: null,
        reconcileBackoffUntil: null,
      };
      const ok = updateRunCas(run.id, version, patch);
      if (!ok) {
        console.log(`[reconcile] stale run=${run.id} action=${action.to}`);
        enqueueReconcile(run.id);
        return;
      }

      appendAudit(run.id, 'reconcile.transition', {
        from: run.status,
        to: action.to,
        reason: action.reason,
      });
      if (action.to === 'completed' && action.reason === 'user-approve') {
        appendAudit(run.id, 'run.approved', { by: 'user' });
      }
      if (action.to === 'cancelled' && action.reason === 'user-cancel') {
        appendAudit(run.id, 'run.cancelled', { by: 'user' });
      }
      appendLog(run.id, 'info', `Status: ${run.status} → ${action.to}`, { reason: action.reason });
      console.log(`[reconcile] transition run=${run.id} ${run.status}→${action.to} reason=${action.reason}`);

      if (action.to === 'provisioning') {
        enqueueExecution(run.id);
      }

      if (action.to === 'queued') {
        enqueueReconcile(run.id);
      }
      return;
    }
  }
}

export function startReconcileLoop() {
  setInterval(() => {
    for (const run of listNonTerminalRuns()) {
      enqueueReconcile(run.id);
    }
  }, 30_000);

  setInterval(() => {
    for (const run of listNonTerminalRuns()) {
      if (['pending', 'queued'].includes(run.status)) {
        enqueueReconcile(run.id);
      }
    }
  }, 3_000);
}
