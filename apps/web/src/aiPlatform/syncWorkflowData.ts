import type { DataSourceType } from './store';
import { getAiPlatformState, refreshAiPlatformState, saveAiPlatformStatePatch } from './store';

const WORKFLOW_SOURCE_IDS = {
  tasks: 'src_workflow_tasks',
  audit: 'src_workflow_audit',
} as const;

export interface WorkflowDataStats {
  runCount: number;
  auditEventCount: number;
}

function upsertWorkflowSource(
  id: string,
  input: {
    name: string;
    type: DataSourceType;
    description: string;
    recordCount: number;
  },
) {
  const state = getAiPlatformState();
  const existing = state.sources.find((item) => item.id === id);
  const updatedAt = new Date().toISOString();

  if (existing) {
    saveAiPlatformStatePatch({
      sources: state.sources.map((item) =>
        item.id === id
          ? {
              ...item,
              recordCount: input.recordCount,
              status: 'ready',
              updatedAt,
            }
          : item,
      ),
    });
    return;
  }

  saveAiPlatformStatePatch({
    sources: [
      {
        id,
        name: input.name,
        type: input.type,
        description: input.description,
        recordCount: input.recordCount,
        status: 'ready',
        updatedAt,
      },
      ...state.sources,
    ],
  });
}

/** 将工作台任务与审计记录同步为 AI 平台数据源（本地演示） */
export function syncWorkflowDataSources(stats: WorkflowDataStats) {
  upsertWorkflowSource(WORKFLOW_SOURCE_IDS.tasks, {
    name: '工作台任务说明',
    type: 'issues',
    description: '自动同步本地任务说明、验收标准与执行状态，可用于构建训练集。',
    recordCount: stats.runCount,
  });

  upsertWorkflowSource(WORKFLOW_SOURCE_IDS.audit, {
    name: '验收与操作记录',
    type: 'audit',
    description: '自动同步人工验收、打回原因与状态变化记录，可用于微调偏好对齐。',
    recordCount: stats.auditEventCount,
  });

  refreshAiPlatformState();
}
