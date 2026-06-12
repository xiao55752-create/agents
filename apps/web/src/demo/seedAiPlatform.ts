import type { Run, RunStatus } from '../types';
import {
  createDataset,
  getAiPlatformState,
  refreshAiPlatformState,
  runCleaning,
  saveAiPlatformStatePatch,
  type TrainingJob,
} from '../aiPlatform/store';
import { syncWorkflowDataSources } from '../aiPlatform/syncWorkflowData';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 为 5 分钟体验路径预置 AI 平台数据（数据集已清洗 + 已完成微调） */
export function seedAiPlatformDemoData(stats: { runCount: number; auditEventCount: number }) {
  syncWorkflowDataSources(stats);

  let state = getAiPlatformState();
  const workflowSourceIds = state.sources
    .filter((item) => item.id === 'src_workflow_tasks' || item.id === 'src_workflow_audit')
    .map((item) => item.id);

  let dataset = state.datasets.find((item) => item.name === '演示体验训练集');
  if (!dataset && workflowSourceIds.length > 0) {
    dataset = createDataset(
      '演示体验训练集',
      workflowSourceIds,
      '由工作台任务与验收记录自动构建，用于微调演示',
    );
    state = getAiPlatformState();
  }

  if (dataset && !dataset.cleaned) {
    runCleaning(dataset.id);
    state = getAiPlatformState();
    dataset = state.datasets.find((item) => item.id === dataset!.id);
  }

  const hasDemoJob = state.trainingJobs.some((job) => job.name === '登录场景微调（演示）');
  if (hasDemoJob || !dataset?.cleaned) {
    refreshAiPlatformState();
    return;
  }

  const now = new Date().toISOString();
  const jobId = uid('train');
  const modelId = `claude-sonnet-4-20250514-ft-${jobId.slice(-6)}`;
  const fineTunedId = `ft-${jobId}`;

  const job: TrainingJob = {
    id: jobId,
    name: '登录场景微调（演示）',
    baseModel: 'claude-sonnet-4-20250514',
    datasetId: dataset.id,
    status: 'completed',
    progress: 100,
    note: '演示数据：微调已完成，模型已发布到模型广场',
    publishedModelId: fineTunedId,
    createdAt: now,
    updatedAt: now,
  };

  saveAiPlatformStatePatch({
    trainingJobs: [job, ...state.trainingJobs],
    fineTunedModels: [
      {
        id: fineTunedId,
        name: '登录场景微调（演示）',
        modelId,
        baseModel: job.baseModel,
        trainingJobId: jobId,
        datasetName: dataset.name,
        createdAt: now,
      },
      ...state.fineTunedModels.filter((item) => item.trainingJobId !== jobId),
    ],
  });

  refreshAiPlatformState();
}
