import type { Page } from './architecture/types';

export interface PlatformPage {
  id: Page;
  title: string;
  subtitle: string;
  features: string[];
}

export interface CoreCapability {
  id: string;
  title: string;
  desc: string;
  page?: Page;
}

/** 工作台/智能体/架构功能一览 — 各页面共用 */
export const PLATFORM_PAGES: PlatformPage[] = [
  {
    id: 'tasks',
    title: '工作台',
    subtitle: '任务说明 → 修改方案 → 人工验收',
    features: [
      '新建任务（问题说明 + 验收标准）',
      '多轮执行轮次对比（摘要 · 变更文件）',
      '5 步进度 · 执行日志 · 操作记录',
      '修改方案预览（变更文件 + 代码差异）',
      '验收前检查（测试 · 变更 · 预算）',
      '人工验收：通过 / 要求修改 / 打回重做',
      '待验收置顶 · 按智能体筛选',
    ],
  },
  {
    id: 'agents',
    title: '智能体',
    subtitle: '行为指令 · 能力包 · 用量预算',
    features: [
      '模型与行为指令配置',
      '挂载内置能力包 · 自动推导工具权限',
      '能力包目录 · 支持创建自定义能力包',
      '月度用量预算（80% 预警 / 100% 停止新任务）',
      '复制 / 删除 · 审计驱动迭代提示',
    ],
  },
  {
    id: 'ai',
    title: 'AI 平台',
    subtitle: '数据工场 · 训练中心 · 模型广场',
    features: [
      '数据采集与清洗规则',
      '工作台任务/审计自动同步数据源',
      '数据集构建与微调任务',
      '训练进度跟踪与状态管理',
      '模型广场浏览、搜索与选用',
      '一键应用到智能体配置',
    ],
  },
  {
    id: 'tokens',
    title: '用量监控',
    subtitle: '消耗统计 · 预算进度 · 高消耗任务',
    features: [
      '总消耗与平均用量概览',
      '按智能体预算进度与预警',
      '成本估算与趋势参考',
      '高消耗任务列表',
      '与通知中心预算提醒联动',
    ],
  },
  {
    id: 'architecture',
    title: '架构',
    subtitle: '系统分层 · 能力边界 · 指标',
    features: [
      '智造基地 9 步对照表',
      '六层架构 + 六大设计原则',
      'Agent 工厂 5 步闭环',
      '路线图 P0–P3',
      '任务质量 / 效率 / 治理指标（实时）',
    ],
  },
];

export const CORE_CAPABILITIES: CoreCapability[] = [
  {
    id: 'gate',
    title: '人工验收',
    desc: '每个修改方案都要人确认，可通过、要求修改或打回重做',
    page: 'tasks',
  },
  {
    id: 'skill',
    title: '能力包授权',
    desc: '智能体只能使用已勾选的能力包，系统会自动限制可用工具',
    page: 'agents',
  },
  {
    id: 'audit',
    title: '操作记录',
    desc: '每次状态变化和验收决定都会记录，方便复盘和优化',
    page: 'tasks',
  },
  {
    id: 'budget',
    title: '用量预算',
    desc: '按智能体设置每月用量上限，接近上限会提醒，用尽后停止新任务',
    page: 'agents',
  },
  {
    id: 'metrics',
    title: '价值度量',
    desc: '成功率、记录覆盖、权限拦截、单任务成本、方案生成率',
    page: 'architecture',
  },
  {
    id: 'mfg',
    title: 'AI 平台',
    desc: '数据工场、训练中心与模型广场，支撑微调与模型选用',
    page: 'ai',
  },
];
