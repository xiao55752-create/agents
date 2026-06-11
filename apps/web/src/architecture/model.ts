/**
 * agentOS 系统化架构模型
 * 融合：Agentic OS 分层 + Agent Factory 闭环 + 现有 MVP
 */

export type LayerStatus = 'demo' | 'planned' | 'future';
export type ImplStatus = 'done' | 'mock' | 'planned';
export type RoadmapStatus = 'done' | 'current' | 'next' | 'later';

export interface ArchModule {
  name: string;
  impl: ImplStatus;
}

export interface ArchLayer {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  modules: ArchModule[];
  agentOS: string;
  status: LayerStatus;
  demoPage?: 'tasks' | 'agents' | 'architecture';
  demoLabel?: string;
}

export interface ArchPillar {
  id: string;
  title: string;
  desc: string;
  principle: string;
  impl: ImplStatus;
  demo?: string;
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  focus: string[];
  outcome: string;
  status: RoadmapStatus;
}

export interface MetricGroup {
  category: string;
  metrics: string[];
  liveKeys?: (keyof import('@agentos/shared').PlatformMetrics)[];
}

/** 六层架构（自下而上） */
export const ARCH_LAYERS: ArchLayer[] = [
  {
    id: 'foundation',
    order: 1,
    title: 'L1 · 模型与知识',
    subtitle: 'Foundation — 垂类 LLM + RAG',
    modules: [
      { name: '垂类大模型 · Prompt 模板', impl: 'done' },
      { name: '行业语料 · 向量库 · 混合检索', impl: 'planned' },
      { name: '推理路由 · KV Cache', impl: 'planned' },
    ],
    agentOS: 'Agent Spec 中的 model / systemPrompt；未来接 RAG',
    status: 'planned',
    demoPage: 'agents',
    demoLabel: '智能体页 · 模型与 Prompt ✅',
  },
  {
    id: 'governance',
    order: 2,
    title: 'L2 · 统一治理',
    subtitle: 'Governance — 安全 · 审计 · 流控',
    modules: [
      { name: '审批门 Human Gate', impl: 'done' },
      { name: 'Audit 不可变事件', impl: 'done' },
      { name: 'Token / 成本流控', impl: 'mock' },
      { name: '权限与租户隔离', impl: 'planned' },
    ],
    agentOS: 'Approve Gate · Audit 时间线 · Run 限额 · Reconcile CAS',
    status: 'demo',
    demoPage: 'tasks',
    demoLabel: '任务页 · Gate 验收 + 审计轨迹 ✅',
  },
  {
    id: 'orchestration',
    order: 3,
    title: 'L3 · 智能体编排',
    subtitle: 'Orchestration — Workflow · Run',
    modules: [
      { name: 'Workflow 模板（issue-to-pr）', impl: 'done' },
      { name: 'Run 状态机 · Reconcile', impl: 'mock' },
      { name: '任务队列与调度', impl: 'mock' },
      { name: '多 Agent 协作', impl: 'planned' },
    ],
    agentOS: 'Run 生命周期 · reconcileRun() · controlIntent',
    status: 'demo',
    demoPage: 'tasks',
    demoLabel: '任务页 · 5 步进度条 + 状态机 ✅',
  },
  {
    id: 'runtime',
    order: 4,
    title: 'L4 · 统一运行时',
    subtitle: 'Runtime — 沙箱 · Executor',
    modules: [
      { name: '实时日志流', impl: 'done' },
      { name: 'Agent Executor · Tool Loop', impl: 'mock' },
      { name: '失败重试与 Resume', impl: 'mock' },
      { name: 'Docker / 隔离沙箱', impl: 'planned' },
    ],
    agentOS: 'Executor 执行面；浏览器内 Mock 模拟',
    status: 'demo',
    demoPage: 'tasks',
    demoLabel: '任务页 · 执行过程 + 重试 ✅',
  },
  {
    id: 'capability',
    order: 5,
    title: 'L5 · Skill 能力层',
    subtitle: 'Capability — Tool · MCP · 注册',
    modules: [
      { name: 'Skill 目录与 Schema', impl: 'done' },
      { name: 'Tool 白名单 · 适配器', impl: 'done' },
      { name: 'GET /api/skills 目录 API', impl: 'done' },
      { name: '版本 · 灰度 · 用户创建 Skill', impl: 'planned' },
      { name: 'MCP 外部工具', impl: 'planned' },
    ],
    agentOS: '内置 Skill 目录 · Agent 挂载 · Tool 白名单推导',
    status: 'demo',
    demoPage: 'agents',
    demoLabel: '智能体页 · Skill 挂载 ✅',
  },
  {
    id: 'experience',
    order: 6,
    title: 'L6 · 统一体验',
    subtitle: 'Experience — 调用 · 产业任务',
    modules: [
      { name: 'Web 控制台 · REST API', impl: 'done' },
      { name: 'Issue → Draft PR → 验收', impl: 'mock' },
      { name: 'GitHub Webhook 接入', impl: 'mock' },
      { name: '可验证工程结果（真实 PR）', impl: 'planned' },
    ],
    agentOS: '三页控制台 + 指标看板',
    status: 'demo',
    demoPage: 'architecture',
    demoLabel: '架构页 · 端到端叙事 + 度量 ✅',
  },
];

/** 六大设计原则 */
export const ARCH_PILLARS: ArchPillar[] = [
  {
    id: 'separation',
    title: '控制与执行分离',
    desc: '控制面只编排，执行面只跑 Job',
    principle: '参考 AgentForge / Agent Factory 控制面',
    impl: 'mock',
    demo: 'Reconcile 不调用 LLM；Executor 不改状态机（前端 Mock）',
  },
  {
    id: 'reconcile',
    title: 'Reconcile 驱动',
    desc: '所有状态变更经 reconcileRun + CAS',
    principle: '参考 K8s / Optio，防 stuck',
    impl: 'mock',
    demo: 'cancel/approve/retry 统一入口（Demo 已实现）',
  },
  {
    id: 'gate',
    title: '人机协同门',
    desc: 'AI 产出方案，人确认后才完成',
    principle: '参考 Agentic OS 治理控制面',
    impl: 'done',
    demo: 'needs_approval → Gate：通过 / 要求修改 / 打回',
  },
  {
    id: 'skill',
    title: 'Skill 最小授权',
    desc: 'Agent 只能挂载注册过的 Skill',
    principle: '参考 Skill 注册机制',
    impl: 'done',
    demo: '内置 Skill 目录 + Tool 推导',
  },
  {
    id: 'observe',
    title: '全链路可观测',
    desc: '日志 · 审计 · 指标 · 反馈闭环',
    principle: '参考 Agent Factory 价值度量',
    impl: 'done',
    demo: '执行日志 + Audit 时间线 + 指标看板',
  },
  {
    id: 'factory',
    title: 'Agent 工厂化',
    desc: '配置 → 发布 → 运行 → 评估 → 迭代',
    principle: '参考 Agent Factory 5 步闭环',
    impl: 'done',
    demo: '配置→运行→验收→审计驱动迭代提示 ✅',
  },
];

/** 优化路线图（5 人团队可执行） */
export const ROADMAP: RoadmapPhase[] = [
  {
    phase: 'P0',
    title: '前端 Demo',
    focus: [
      '三页：任务 Gate · 智能体 Skill/预算 · 架构智造对照',
      'Issue 意图 · Draft PR · 审计 · 度量',
      '本地模式零后端',
    ],
    outcome: '完整产品面可本地运行',
    status: 'done',
  },
  {
    phase: 'P1',
    title: '控制面 MVP（暂缓）',
    focus: ['真实 API + Reconcile', 'Approve Gate + Audit', 'Agent/Skill CRUD'],
    outcome: '需要时再启 dev:full；当前不做',
    status: 'next',
  },
  {
    phase: 'P2',
    title: '运行时 + Skill',
    focus: ['Docker Runner', 'LLM Tool Loop', 'GitHub Draft PR', '用户创建 Skill'],
    outcome: '真实工程自动化',
    status: 'next',
  },
  {
    phase: 'P3',
    title: 'Agent Factory',
    focus: ['RAG 知识库', '多 Workflow', 'SLO / 成本度量', '多租户 SSO'],
    outcome: '企业级 Agentic OS',
    status: 'later',
  },
];

/** 价值度量（参考 Agent Factory） */
export const METRICS: MetricGroup[] = [
  {
    category: '任务质量',
    metrics: ['Run 成功率', '人工打回率', '要求修改率', 'Issue→PR 转化率'],
    liveKeys: ['successRate', 'rejectRate', 'reviseRate', 'issueToPrRate'],
  },
  {
    category: '效率',
    metrics: ['任务完成时长', 'Token 消耗', '并发 Run 数'],
    liveKeys: ['avgDurationSec', 'avgTokens', 'activeRuns'],
  },
  {
    category: '治理',
    metrics: ['审批通过率', 'Audit 覆盖率', '越权 Tool 拦截'],
    liveKeys: ['approvalRate', 'auditCoverageRate', 'toolInterceptRate'],
  },
  {
    category: '商业',
    metrics: ['单任务成本', 'Workflow 复用率', '总 Token 成本'],
    liveKeys: ['avgCostUsd', 'workflowReuseRate', 'totalCostUsd'],
  },
];

/** Agent 工厂化 5 步闭环 */
export const FACTORY_LOOP = [
  { step: 1, title: '接入', desc: 'Issue / API / Webhook 触发 Run', impl: 'mock' as ImplStatus },
  { step: 2, title: '配置', desc: 'Agent Spec · Skill · Workflow 模板', impl: 'done' as ImplStatus },
  { step: 3, title: '执行', desc: 'Runtime 沙箱 · Tool Loop · 日志', impl: 'mock' as ImplStatus },
  { step: 4, title: '验收', desc: 'Human Gate · Draft PR · 审批', impl: 'done' as ImplStatus },
  { step: 5, title: '迭代', desc: 'Audit 分析 · Prompt 调优 · 预算/Gate 指标', impl: 'done' as ImplStatus },
];

export const IMPL_LABEL: Record<ImplStatus, string> = {
  done: '已实现',
  mock: 'Mock',
  planned: '规划中',
};

export const POSITIONING = {
  tagline: '面向工程团队的 Agentic OS — 治理 · 编排 · 验收',
  vsAgenticOS: '统一治理 + Skill 注册 + 产业任务，聚焦开发者自动化垂直场景',
  vsFactory: '吸收「控制面 + 工厂化闭环 + 价值度量」，不做底层训练/推理集群',
  vsManufacturingBase: '覆盖智造链中「架构·研发·测试·安全」段；数据/训练/RAG 明确不做',
  focus: '本地模式三页功能已对齐；后端 P1 暂缓，apps/api 保留供后续启用',
};

/** 智造基地 9 步 ↔ agentOS 对照（产业全景 · 只读） */
export type ManufacturingScope = 'focus' | 'partial' | 'excluded';

export interface ManufacturingStep {
  step: number;
  title: string;
  industryDesc: string;
  agentOS: string;
  layerRef: string;
  impl: ImplStatus;
  scope: ManufacturingScope;
  demoPage?: 'tasks' | 'agents' | 'architecture';
}

export const MANUFACTURING_SCOPE_LABEL: Record<ManufacturingScope, string> = {
  focus: '主攻',
  partial: '部分覆盖',
  excluded: '明确不做',
};

export const MANUFACTURING_BASE_9: ManufacturingStep[] = [
  {
    step: 1,
    title: '场景需求分析',
    industryDesc: '深入业务一线，定义 Agent 角色与 KPI',
    agentOS: 'Issue 意图 + 验收标准 KPI · Gate 指标 · 轮次对比',
    layerRef: 'L6 体验',
    impl: 'done',
    scope: 'partial',
    demoPage: 'tasks',
  },
  {
    step: 2,
    title: '数据处理区',
    industryDesc: '多源异构数据清洗、标注、隐私脱敏',
    agentOS: '— 非控制面职责，Issue/代码上下文由 GitHub 提供',
    layerRef: '—',
    impl: 'planned',
    scope: 'excluded',
  },
  {
    step: 3,
    title: '知识精炼区',
    industryDesc: '企业专属知识库 · RAG 检索增强',
    agentOS: '— P3 可选；当前 Issue + 仓库代码已够用',
    layerRef: 'L1 模型与知识',
    impl: 'planned',
    scope: 'excluded',
  },
  {
    step: 4,
    title: '模型训练与推理',
    industryDesc: 'MoE 训练 · 弹性 PD 分离推理降本',
    agentOS: '— 调用商用 LLM API，不做训练/推理集群',
    layerRef: 'L1 模型与知识',
    impl: 'planned',
    scope: 'excluded',
  },
  {
    step: 5,
    title: '智能体架构设计',
    industryDesc: '感知 — 记忆 — 决策 — 执行 闭环',
    agentOS: '六层架构 · 控制/执行分离 · Run 状态机',
    layerRef: 'L3 编排 + L4 运行时',
    impl: 'mock',
    scope: 'focus',
    demoPage: 'architecture',
  },
  {
    step: 6,
    title: '前后端研发',
    industryDesc: '工作流编排 · Tool 调用 · 端到端串联',
    agentOS: 'issue-to-pr Workflow · Skill 挂载 · Tool 白名单',
    layerRef: 'L3 + L5 + L6',
    impl: 'done',
    scope: 'focus',
    demoPage: 'agents',
  },
  {
    step: 7,
    title: '功能测试区',
    industryDesc: '对抗样本检测 · 行为异常模拟',
    agentOS: 'test-run Skill · 失败重试 · 未过测试不开 PR（Prompt 约束）',
    layerRef: 'L4 运行时',
    impl: 'mock',
    scope: 'partial',
    demoPage: 'tasks',
  },
  {
    step: 8,
    title: '安全防护区',
    industryDesc: '权限控制 · 行为审计 · 内容合规围栏',
    agentOS: 'Human Gate · Audit 轨迹 · 预算硬停 · Skill 最小授权',
    layerRef: 'L2 统一治理',
    impl: 'done',
    scope: 'focus',
    demoPage: 'tasks',
  },
  {
    step: 9,
    title: '交付部署区',
    industryDesc: 'SaaS · 私有化 · 混合云多模式交付',
    agentOS: '本地模式（当前）→ 未来 SaaS / 私有化部署',
    layerRef: 'L6 体验',
    impl: 'mock',
    scope: 'partial',
    demoPage: 'architecture',
  },
];
