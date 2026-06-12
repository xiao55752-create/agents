const STORAGE_KEY = 'agentos-ai-platform-v1';

export type DataSourceType = 'github' | 'issues' | 'audit' | 'manual';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  description: string;
  recordCount: number;
  status: JobStatus | 'ready';
  updatedAt: string;
}

export interface Dataset {
  id: string;
  name: string;
  sourceIds: string[];
  recordCount: number;
  cleaned: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CleaningRule {
  id: string;
  label: string;
  enabled: boolean;
}

export interface TrainingJob {
  id: string;
  name: string;
  baseModel: string;
  datasetId: string;
  status: JobStatus;
  progress: number;
  note?: string;
  publishedModelId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FineTunedModelRecord {
  id: string;
  name: string;
  modelId: string;
  baseModel: string;
  trainingJobId: string;
  datasetName: string;
  createdAt: string;
}

interface AiPlatformState {
  sources: DataSource[];
  datasets: Dataset[];
  cleaningRules: CleaningRule[];
  trainingJobs: TrainingJob[];
  fineTunedModels: FineTunedModelRecord[];
}

const DEFAULT_RULES: CleaningRule[] = [
  { id: 'dedupe', label: '去重相同 Issue 与验收记录', enabled: true },
  { id: 'mask', label: '脱敏邮箱、Token、密钥字段', enabled: true },
  { id: 'normalize', label: '统一标题、正文与验收标准格式', enabled: true },
  { id: 'filter', label: '过滤未完成或无效任务', enabled: false },
];

const DEFAULT_SOURCES: DataSource[] = [
  {
    id: 'src_github',
    name: 'GitHub Issue 同步',
    type: 'github',
    description: '从仓库 Issue 拉取标题、正文、标签与评论',
    recordCount: 128,
    status: 'ready',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'src_audit',
    name: '验收与审计记录',
    type: 'audit',
    description: '采集 Gate 决策、修改意见、打回原因',
    recordCount: 56,
    status: 'ready',
    updatedAt: new Date().toISOString(),
  },
];

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadState(): AiPlatformState {
  const defaults: AiPlatformState = {
    sources: DEFAULT_SOURCES,
    datasets: [],
    cleaningRules: DEFAULT_RULES,
    trainingJobs: [],
    fineTunedModels: [],
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiPlatformState>;
      return {
        ...defaults,
        ...parsed,
        fineTunedModels: parsed.fineTunedModels ?? [],
      };
    }
  } catch {
    /* ignore */
  }
  return defaults;
}

function saveState(state: AiPlatformState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveAiPlatformStatePatch(patch: Partial<AiPlatformState>) {
  state = { ...loadState(), ...patch };
  saveState(state);
  return state;
}

let state = loadState();

export function getAiPlatformState() {
  state = loadState();
  return state;
}

export function refreshAiPlatformState() {
  state = loadState();
  return state;
}

export function addDataSource(input: Omit<DataSource, 'id' | 'recordCount' | 'status' | 'updatedAt'>) {
  const next: DataSource = {
    ...input,
    id: uid('src'),
    recordCount: 0,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  };
  state = { ...state, sources: [next, ...state.sources] };
  saveState(state);
  simulateSourceCollect(next.id);
  return next;
}

function simulateSourceCollect(sourceId: string) {
  window.setTimeout(() => {
    state = loadState();
    state.sources = state.sources.map((item) =>
      item.id === sourceId
        ? {
            ...item,
            status: 'ready',
            recordCount: 20 + Math.floor(Math.random() * 80),
            updatedAt: new Date().toISOString(),
          }
        : item,
    );
    saveState(state);
  }, 1200);
}

export function createDataset(name: string, sourceIds: string[], description: string) {
  const records = state.sources
    .filter((item) => sourceIds.includes(item.id))
    .reduce((sum, item) => sum + item.recordCount, 0);
  const now = new Date().toISOString();
  const dataset: Dataset = {
    id: uid('ds'),
    name,
    sourceIds,
    recordCount: records,
    cleaned: false,
    description,
    createdAt: now,
    updatedAt: now,
  };
  state = { ...state, datasets: [dataset, ...state.datasets] };
  saveState(state);
  return dataset;
}

export function runCleaning(datasetId: string) {
  const dataset = state.datasets.find((item) => item.id === datasetId);
  if (!dataset) throw new Error('数据集不存在');
  const enabledRules = state.cleaningRules.filter((rule) => rule.enabled).length;
  const cleanedCount = Math.max(1, Math.round(dataset.recordCount * (0.72 + enabledRules * 0.04)));
  state = {
    ...state,
    datasets: state.datasets.map((item) =>
      item.id === datasetId
        ? { ...item, cleaned: true, recordCount: cleanedCount, updatedAt: new Date().toISOString() }
        : item,
    ),
  };
  saveState(state);
  return state.datasets.find((item) => item.id === datasetId)!;
}

export function toggleCleaningRule(ruleId: string) {
  state = {
    ...state,
    cleaningRules: state.cleaningRules.map((rule) =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
    ),
  };
  saveState(state);
}

export function createTrainingJob(name: string, baseModel: string, datasetId: string) {
  const dataset = state.datasets.find((item) => item.id === datasetId);
  if (!dataset) throw new Error('数据集不存在');
  if (!dataset.cleaned) throw new Error('请先完成数据清洗');
  const now = new Date().toISOString();
  const job: TrainingJob = {
    id: uid('train'),
    name,
    baseModel,
    datasetId,
    status: 'pending',
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };
  state = { ...state, trainingJobs: [job, ...state.trainingJobs] };
  saveState(state);
  simulateTraining(job.id);
  return job;
}

function publishFineTunedModel(job: TrainingJob): FineTunedModelRecord {
  state = loadState();
  if (job.publishedModelId) {
    const existing = state.fineTunedModels.find((item) => item.id === job.publishedModelId);
    if (existing) return existing;
  }

  const dataset = state.datasets.find((item) => item.id === job.datasetId);
  const record: FineTunedModelRecord = {
    id: `ft-${job.id}`,
    name: job.name,
    modelId: `${job.baseModel}-ft-${job.id.slice(-6)}`,
    baseModel: job.baseModel,
    trainingJobId: job.id,
    datasetName: dataset?.name ?? '训练数据集',
    createdAt: new Date().toISOString(),
  };

  const fineTunedModels = [
    record,
    ...state.fineTunedModels.filter((item) => item.trainingJobId !== job.id),
  ];

  state = {
    ...state,
    fineTunedModels,
    trainingJobs: state.trainingJobs.map((item) =>
      item.id === job.id ? { ...item, publishedModelId: record.id } : item,
    ),
  };
  saveState(state);
  return record;
}

function simulateTraining(jobId: string) {
  let progress = 0;
  const timer = window.setInterval(() => {
    state = loadState();
    const job = state.trainingJobs.find((item) => item.id === jobId);
    if (!job) {
      window.clearInterval(timer);
      return;
    }
    progress += 18 + Math.floor(Math.random() * 12);
    const nextProgress = Math.min(100, progress);
    const nextStatus: JobStatus = nextProgress >= 100 ? 'completed' : 'running';

    if (nextStatus === 'completed' && !job.publishedModelId) {
      publishFineTunedModel(job);
    }

    state = loadState();
    state.trainingJobs = state.trainingJobs.map((item) =>
      item.id === jobId
        ? {
            ...item,
            progress: nextProgress,
            status: nextStatus,
            note:
              nextStatus === 'completed'
                ? '微调完成，已发布到模型广场，可「应用到智能体」'
                : '正在训练…',
            updatedAt: new Date().toISOString(),
          }
        : item,
    );
    saveState(state);
    if (nextProgress >= 100) window.clearInterval(timer);
  }, 900);
}

export function getFineTunedModels(): FineTunedModelRecord[] {
  return getAiPlatformState().fineTunedModels;
}

export const PREFERRED_MODEL_KEY = 'agentos_preferred_model';
export const AI_TAB_KEY = 'agentos_ai_tab';

export function setPreferredModel(modelId: string) {
  sessionStorage.setItem(PREFERRED_MODEL_KEY, modelId);
}

export function consumePreferredModel(): string | null {
  const value = sessionStorage.getItem(PREFERRED_MODEL_KEY);
  if (value) sessionStorage.removeItem(PREFERRED_MODEL_KEY);
  return value;
}

export function setAiPlatformTab(tab: 'models' | 'data' | 'training') {
  sessionStorage.setItem(AI_TAB_KEY, tab);
}

export function consumeAiPlatformTab(): 'models' | 'data' | 'training' | null {
  const value = sessionStorage.getItem(AI_TAB_KEY);
  if (!value) return null;
  sessionStorage.removeItem(AI_TAB_KEY);
  if (value === 'models' || value === 'data' || value === 'training') return value;
  return null;
}
