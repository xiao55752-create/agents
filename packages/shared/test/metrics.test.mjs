import test from 'node:test';
import assert from 'node:assert/strict';
import { computePlatformMetrics, formatMetricUsd } from '../dist/index.js';

const runs = [
  {
    id: 'run_1',
    agentId: 'agt_1',
    workflow: 'issue-to-pr',
    status: 'completed',
    tokensUsed: 10000,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:01:00.000Z',
  },
  {
    id: 'run_2',
    agentId: 'agt_1',
    workflow: 'issue-to-pr',
    status: 'needs_approval',
    tokensUsed: 20000,
    createdAt: '2026-06-01T00:02:00.000Z',
    updatedAt: '2026-06-01T00:04:00.000Z',
  },
  {
    id: 'run_3',
    agentId: 'agt_2',
    workflow: 'issue-to-pr',
    status: 'failed',
    tokensUsed: 0,
    createdAt: '2026-06-01T00:05:00.000Z',
    updatedAt: '2026-06-01T00:05:30.000Z',
  },
];

const audits = {
  run_1: [{ type: 'pr.opened' }, { type: 'run.approved' }],
  run_2: [
    { type: 'pr.opened' },
    { type: 'run.reject_retry' },
    { type: 'run.revision_requested' },
    { type: 'tool.intercepted' },
  ],
  run_3: [{ type: 'tests.failed' }],
};

test('computes task, gate, audit, cost, and reuse metrics', () => {
  const metrics = computePlatformMetrics(runs, audits);

  assert.equal(metrics.totalRuns, 3);
  assert.equal(metrics.completedRuns, 1);
  assert.equal(metrics.failedRuns, 1);
  assert.equal(metrics.needsApprovalRuns, 1);
  assert.equal(metrics.successRate, 50);
  assert.equal(metrics.approvalRate, 50);
  assert.equal(metrics.issueToPrRate, 67);
  assert.equal(metrics.rejectRate, 33);
  assert.equal(metrics.reviseRate, 33);
  assert.equal(metrics.auditCoverageRate, 100);
  assert.equal(metrics.toolInterceptRate, 33);
  assert.equal(metrics.workflowReuseRate, 33);
  assert.equal(metrics.avgDurationSec, 45);
  assert.equal(metrics.avgTokens, 15000);
  assert.equal(metrics.totalTokens, 30000);
  assert.equal(metrics.totalCostUsd, 0.06);
  assert.equal(metrics.avgCostUsd, 0.03);
});

test('returns zeroed metrics for empty input', () => {
  const metrics = computePlatformMetrics([], {});

  assert.equal(metrics.totalRuns, 0);
  assert.equal(metrics.successRate, 0);
  assert.equal(metrics.issueToPrRate, 0);
  assert.equal(metrics.auditCoverageRate, 0);
  assert.equal(metrics.totalCostUsd, 0);
});

test('formats small USD metrics for dashboard display', () => {
  assert.equal(formatMetricUsd(1.2), '$1.20');
  assert.equal(formatMetricUsd(0.03), '$0.030');
  assert.equal(formatMetricUsd(0.004), '$0.0040');
});
