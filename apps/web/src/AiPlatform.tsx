import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  buildPlazaModelsFromRecords,
  MODEL_SOURCE_LABEL,
  MODEL_STATUS_LABEL,
  type PlazaModel,
} from './aiPlatform/catalog';
import {
  addDataSource,
  createDataset,
  createTrainingJob,
  getAiPlatformState,
  refreshAiPlatformState,
  runCleaning,
  setPreferredModel,
  toggleCleaningRule,
  consumeAiPlatformTab,
  type DataSourceType,
  type TrainingJob,
} from './aiPlatform/store';
import { AiLoopDiagram } from './aiPlatform/AiLoopDiagram';
import { EmptyState } from './visuals/EmptyState';

type AiTab = 'models' | 'data' | 'training';

interface AiPlatformProps {
  onUseModel: (modelId: string) => void;
}

const SOURCE_TYPE_LABEL: Record<DataSourceType, string> = {
  github: 'GitHub',
  issues: '任务说明',
  audit: '审计记录',
  manual: '手动导入',
};

const JOB_STATUS_LABEL = {
  pending: '排队中',
  running: '进行中',
  completed: '已完成',
  failed: '失败',
  ready: '已就绪',
} as const;

export function AiPlatform({ onUseModel }: AiPlatformProps) {
  const [tab, setTab] = useState<AiTab>(() => consumeAiPlatformTab() ?? 'data');
  const [state, setState] = useState(() => getAiPlatformState());
  const [modelQuery, setModelQuery] = useState('');
  const [sourceName, setSourceName] = useState('Slack 反馈同步');
  const [sourceType, setSourceType] = useState<DataSourceType>('manual');
  const [datasetName, setDatasetName] = useState('Issue 修复训练集 v1');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [trainingName, setTrainingName] = useState('登录问题微调任务');
  const [trainingModel, setTrainingModel] = useState('claude-sonnet-4-20250514');
  const [trainingDatasetId, setTrainingDatasetId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [highlightModelId, setHighlightModelId] = useState<string | null>(null);

  const plazaModels = useMemo(
    () => buildPlazaModelsFromRecords(state.fineTunedModels),
    [state.fineTunedModels],
  );
  const showDemoPath = state.datasets.length === 0 && state.trainingJobs.length === 0;

  useEffect(() => {
    const timer = window.setInterval(() => setState(refreshAiPlatformState()), 1500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!trainingDatasetId && state.datasets.length > 0) {
      setTrainingDatasetId(state.datasets[0]!.id);
    }
  }, [state.datasets, trainingDatasetId]);

  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    if (!q) return plazaModels;
    return plazaModels.filter(
      (model) =>
        model.name.toLowerCase().includes(q) ||
        model.provider.toLowerCase().includes(q) ||
        model.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [modelQuery, plazaModels]);

  function reload() {
    setState(refreshAiPlatformState());
  }

  function handleUseModel(model: PlazaModel) {
    setPreferredModel(model.modelId);
    onUseModel(model.modelId);
    setMessage(`已将 ${model.name} 设为智能体默认模型，请到智能体页保存配置。`);
  }

  function handleAddSource(e: FormEvent) {
    e.preventDefault();
    addDataSource({
      name: sourceName.trim(),
      type: sourceType,
      description: '本地演示数据源，采集完成后可用于构建数据集。',
    });
    setSourceName('');
    reload();
    setMessage('数据源已创建，正在模拟采集…');
  }

  function handleCreateDataset(e: FormEvent) {
    e.preventDefault();
    if (selectedSources.length === 0) {
      setMessage('请至少选择一个数据源。');
      return;
    }
    createDataset(datasetName.trim(), selectedSources, '用于微调的训练数据集');
    reload();
    setMessage('数据集已创建，可继续执行清洗。');
  }

  function handleClean(datasetId: string) {
    runCleaning(datasetId);
    reload();
    setMessage('数据清洗完成，记录数已更新。');
  }

  function handleCreateTraining(e: FormEvent) {
    e.preventDefault();
    try {
      createTrainingJob(trainingName.trim(), trainingModel, trainingDatasetId);
      reload();
      setMessage('微调任务已创建，可在下方查看进度。');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '创建失败');
    }
  }

  return (
    <main className="main ai-main">
      <div className="ai-page">
        <section className="ai-hero" data-tour="ai-platform">
          <div>
            <span className="section-kicker">AI 平台</span>
            <h2>数据工场 · 训练中心 · 模型广场</h2>
            <p>从数据采集、清洗到模型微调，再到智能体调用，形成完整闭环。当前为本地演示模式。</p>
          </div>
          <div className="ai-tabs">
            <button type="button" className={tab === 'data' ? 'ai-tab active' : 'ai-tab'} onClick={() => setTab('data')}>
              数据工场
            </button>
            <button type="button" className={tab === 'training' ? 'ai-tab active' : 'ai-tab'} onClick={() => setTab('training')}>
              训练中心
            </button>
            <button type="button" className={tab === 'models' ? 'ai-tab active' : 'ai-tab'} onClick={() => setTab('models')}>
              模型广场
            </button>
          </div>
        </section>

        <AiLoopDiagram activeTab={tab} onSelectTab={setTab} />

        {message && <p className="ai-message">{message}</p>}

        {showDemoPath && (
          <section className="ai-demo-path">
            <strong>推荐体验：数据 → 训练 → 模型</strong>
            <ol>
              <li>在「数据工场」勾选已同步的工作台数据源，生成数据集并执行清洗</li>
              <li>到「训练中心」创建微调任务，等待进度完成</li>
              <li>微调模型会自动出现在「模型广场」，点击「应用到智能体」即可选用</li>
            </ol>
          </section>
        )}

        {tab === 'models' && (
          <>
            <div className="ai-toolbar">
              <input
                type="search"
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder="搜索模型、厂商或标签…"
              />
            </div>
            <div className="model-plaza-grid">
              {filteredModels.map((model) => (
                <article
                  key={model.id}
                  className={`model-plaza-card model-plaza-${model.status}${highlightModelId === model.id ? ' model-plaza-highlight' : ''}`}
                >
                  <div className="model-plaza-head">
                    <div>
                      <strong>{model.name}</strong>
                      <span>{model.provider} · {model.contextWindow}</span>
                    </div>
                    <div className="model-plaza-badges">
                      <em>{MODEL_STATUS_LABEL[model.status]}</em>
                      <em>{MODEL_SOURCE_LABEL[model.source]}</em>
                    </div>
                  </div>
                  <p>{model.description}</p>
                  <div className="model-plaza-tags">
                    {model.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="model-plaza-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handleUseModel(model)}>
                      应用到智能体
                    </button>
                    {model.recommended && <span className="model-plaza-recommend">推荐</span>}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === 'data' && (
          <div className="ai-data-layout">
            <section className="ai-panel">
              <div className="ai-panel-head">
                <h3>数据采集</h3>
                <p>创建数据源，模拟从 GitHub、审计记录等渠道拉取训练素材。工作台的 task 与操作记录会自动同步为数据源。</p>
              </div>
              <form className="ai-form" onSubmit={handleAddSource}>
                <label>
                  数据源名称
                  <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} required />
                </label>
                <label>
                  来源类型
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value as DataSourceType)}>
                    <option value="github">GitHub</option>
                    <option value="issues">任务说明</option>
                    <option value="audit">审计记录</option>
                    <option value="manual">手动导入</option>
                  </select>
                </label>
                <button type="submit" className="btn btn-primary btn-sm">创建并采集</button>
              </form>
              <ul className="ai-list">
                {state.sources.length === 0 ? (
                  <li className="ai-list-empty">
                    <EmptyState variant="ai-data" title="暂无数据源">
                      <p>工作台任务会自动同步；也可手动创建数据源开始采集。</p>
                    </EmptyState>
                  </li>
                ) : (
                  state.sources.map((source) => (
                    <li key={source.id}>
                      <strong>{source.name}</strong>
                      <span>{SOURCE_TYPE_LABEL[source.type]} · {source.recordCount} 条 · {JOB_STATUS_LABEL[source.status]}</span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="ai-panel">
              <div className="ai-panel-head">
                <h3>数据清洗</h3>
                <p>选择规则清洗数据集，为微调做准备。</p>
              </div>
              <div className="ai-rule-list">
                {state.cleaningRules.map((rule) => (
                  <label key={rule.id} className="ai-rule-item">
                    <input type="checkbox" checked={rule.enabled} onChange={() => { toggleCleaningRule(rule.id); reload(); }} />
                    <span>{rule.label}</span>
                  </label>
                ))}
              </div>
              <form className="ai-form" onSubmit={handleCreateDataset}>
                <label>
                  数据集名称
                  <input value={datasetName} onChange={(e) => setDatasetName(e.target.value)} required />
                </label>
                <fieldset className="ai-source-picker">
                  <legend>选择数据源</legend>
                  {state.sources.map((source) => (
                    <label key={source.id}>
                      <input
                        type="checkbox"
                        checked={selectedSources.includes(source.id)}
                        onChange={(e) =>
                          setSelectedSources((prev) =>
                            e.target.checked ? [...prev, source.id] : prev.filter((id) => id !== source.id),
                          )
                        }
                      />
                      <span>{source.name}（{source.recordCount} 条）</span>
                    </label>
                  ))}
                </fieldset>
                <button type="submit" className="btn btn-primary btn-sm">生成数据集</button>
              </form>
              <ul className="ai-list">
                {state.datasets.map((dataset) => (
                  <li key={dataset.id} className="ai-dataset-item">
                    <div>
                      <strong>{dataset.name}</strong>
                      <span>{dataset.recordCount} 条 · {dataset.cleaned ? '已清洗' : '未清洗'}</span>
                    </div>
                    {!dataset.cleaned && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleClean(dataset.id)}>
                        执行清洗
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === 'training' && (
          <div className="ai-training-layout">
            <section className="ai-panel">
              <div className="ai-panel-head">
                <h3>创建微调任务</h3>
                <p>基于已清洗数据集，对基座模型进行微调（本地模拟）。</p>
              </div>
              <form className="ai-form" onSubmit={handleCreateTraining}>
                <label>
                  任务名称
                  <input value={trainingName} onChange={(e) => setTrainingName(e.target.value)} required />
                </label>
                <label>
                  基座模型
                  <select value={trainingModel} onChange={(e) => setTrainingModel(e.target.value)}>
                    {plazaModels.filter((model) => model.status !== 'beta' && model.status !== 'fine_tuned').map((model) => (
                      <option key={model.id} value={model.modelId}>{model.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  训练数据集
                  <select value={trainingDatasetId} onChange={(e) => setTrainingDatasetId(e.target.value)}>
                    <option value="">请选择</option>
                    {state.datasets.filter((item) => item.cleaned).map((dataset) => (
                      <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!trainingDatasetId}>
                  开始微调
                </button>
              </form>
            </section>

            <section className="ai-panel">
              <div className="ai-panel-head">
                <h3>微调任务列表</h3>
              </div>
              {state.trainingJobs.length === 0 ? (
                <EmptyState variant="ai-training" title="暂无微调任务">
                  <p>还没有微调任务。请先在数据工场准备并清洗数据集。</p>
                </EmptyState>
              ) : (
                <ul className="ai-training-list">
                  {state.trainingJobs.map((job) => (
                    <TrainingJobCard
                      key={job.id}
                      job={job}
                      datasets={state.datasets}
                      onViewInPlaza={(modelId) => {
                        setTab('models');
                        setHighlightModelId(modelId);
                        setMessage('微调模型已发布到模型广场，可直接「应用到智能体」。');
                        window.setTimeout(() => setHighlightModelId(null), 4000);
                      }}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function TrainingJobCard({
  job,
  datasets,
  onViewInPlaza,
}: {
  job: TrainingJob;
  datasets: { id: string; name: string }[];
  onViewInPlaza: (modelId: string) => void;
}) {
  const dataset = datasets.find((item) => item.id === job.datasetId);
  return (
    <li className="ai-training-item">
      <div>
        <strong>{job.name}</strong>
        <span>{dataset?.name ?? '未知数据集'} · {JOB_STATUS_LABEL[job.status]}</span>
        {job.note && <p>{job.note}</p>}
        {job.status === 'completed' && job.publishedModelId && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onViewInPlaza(job.publishedModelId!)}
          >
            在模型广场查看 →
          </button>
        )}
      </div>
      <div className="ai-training-progress">
        <div className="token-meter" aria-hidden>
          <div className={`token-meter-fill token-meter-${job.status === 'completed' ? 'ok' : job.status === 'failed' ? 'danger' : 'warn'}`} style={{ width: `${job.progress}%` }} />
        </div>
        <span>{job.progress}%</span>
      </div>
    </li>
  );
}
