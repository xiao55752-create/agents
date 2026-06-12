import { getFineTunedModels, type FineTunedModelRecord } from './store';

export type ModelSource = 'official' | 'community' | 'custom';
export type ModelStatus = 'available' | 'beta' | 'fine_tuned';

export interface PlazaModel {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  tags: string[];
  contextWindow: string;
  description: string;
  status: ModelStatus;
  source: ModelSource;
  recommended?: boolean;
}

export const PLAZA_MODELS: PlazaModel[] = [
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    modelId: 'claude-sonnet-4-20250514',
    tags: ['代码修复', '长上下文', '推荐'],
    contextWindow: '200K',
    description: '适合 Issue 修复、代码理解与 Draft PR 生成，平衡质量与成本。',
    status: 'available',
    source: 'official',
    recommended: true,
  },
  {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'Anthropic',
    modelId: 'claude-opus-4-20250514',
    tags: ['复杂推理', '高质量'],
    contextWindow: '200K',
    description: '适合复杂重构、跨模块改动和高质量验收场景。',
    status: 'available',
    source: 'official',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    modelId: 'gpt-4.1',
    tags: ['通用', '工具调用'],
    contextWindow: '128K',
    description: '通用工程智能体基座，工具调用与指令遵循稳定。',
    status: 'available',
    source: 'official',
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'OpenAI',
    modelId: 'gpt-4.1-mini',
    tags: ['低成本', '批量任务'],
    contextWindow: '128K',
    description: '适合批量小改动、文档类任务和成本敏感场景。',
    status: 'available',
    source: 'official',
  },
  {
    id: 'issue-fix-ft',
    name: 'Issue Fix 微调版',
    provider: 'agentOS',
    modelId: 'claude-sonnet-4-20250514',
    tags: ['微调', '登录问题', 'Issue→PR'],
    contextWindow: '200K',
    description: '基于历史验收数据微调，专注登录、表单、前端交互类 Issue。',
    status: 'fine_tuned',
    source: 'custom',
  },
  {
    id: 'code-review-beta',
    name: 'Code Review Copilot',
    provider: 'Community',
    modelId: 'gpt-4.1-mini',
    tags: ['社区', '代码审查', 'Beta'],
    contextWindow: '128K',
    description: '社区贡献的审查向模型，适合 PR 摘要与风险点提示。',
    status: 'beta',
    source: 'community',
  },
];

export const MODEL_SOURCE_LABEL: Record<ModelSource, string> = {
  official: '官方',
  community: '社区',
  custom: '团队微调',
};

export const MODEL_STATUS_LABEL: Record<ModelStatus, string> = {
  available: '可用',
  beta: 'Beta',
  fine_tuned: '微调模型',
};

function baseModelLabel(modelId: string): string {
  const base = PLAZA_MODELS.find((model) => model.modelId === modelId);
  return base?.name ?? modelId;
}

export function buildPlazaModelsFromRecords(records: FineTunedModelRecord[]): PlazaModel[] {
  const fineTuned = records.map((item) => ({
    id: item.id,
    name: item.name,
    provider: 'agentOS',
    modelId: item.modelId,
    tags: ['微调', item.datasetName],
    contextWindow: '200K',
    description: `基于 ${baseModelLabel(item.baseModel)} 与「${item.datasetName}」微调，可在智能体页直接选用。`,
    status: 'fine_tuned' as const,
    source: 'custom' as const,
  }));
  const ids = new Set(fineTuned.map((model) => model.id));
  return [...fineTuned, ...PLAZA_MODELS.filter((model) => !ids.has(model.id))];
}

export function listPlazaModels(): PlazaModel[] {
  return buildPlazaModelsFromRecords(getFineTunedModels());
}
