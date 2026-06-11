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

/** 三页功能一览 — 各页面共用 */
export const PLATFORM_PAGES: PlatformPage[] = [
  {
    id: 'tasks',
    title: '任务',
    subtitle: 'Issue → Draft PR → 人工 Gate',
    features: [
      '新建任务（Issue 意图 + 验收标准 KPI）',
      '多轮执行轮次对比（摘要 · 变更文件）',
      '5 步进度 · 执行日志 · 审计轨迹',
      'Draft PR 预览（变更文件 + diff）',
      'Gate 前检查（测试 · 变更 · 预算）',
      'Human Gate：通过 / 要求修改 / 打回重做',
      '待验收置顶 · 按智能体筛选',
    ],
  },
  {
    id: 'agents',
    title: '智能体',
    subtitle: 'Spec · Skill · 预算流控',
    features: [
      '模型与 System Prompt 配置',
      '挂载内置 Skill · Tool 白名单推导',
      'Skill 目录只读浏览',
      '月度 Token 预算（80% 预警 / 100% 硬停）',
      '复制 / 删除 · 审计驱动迭代提示',
    ],
  },
  {
    id: 'architecture',
    title: '架构',
    subtitle: '六层模型 · 智造对照 · 度量',
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
    title: 'Human Gate',
    desc: 'Draft PR 必须人工验收，支持通过、带说明修改、打回自动重跑',
    page: 'tasks',
  },
  {
    id: 'skill',
    title: 'Skill 最小授权',
    desc: '智能体只能挂载注册 Skill，Tool 白名单自动推导',
    page: 'agents',
  },
  {
    id: 'audit',
    title: '审计轨迹',
    desc: 'Gate 决策与状态变更不可变记录，支撑迭代与治理',
    page: 'tasks',
  },
  {
    id: 'budget',
    title: '成本流控',
    desc: '按智能体月度 Token 预算模拟，超 80% 预警、用尽拦截新建',
    page: 'agents',
  },
  {
    id: 'metrics',
    title: '价值度量',
    desc: '成功率、Audit 覆盖、越权拦截、单任务成本、Issue→PR',
    page: 'architecture',
  },
  {
    id: 'mfg',
    title: '智造基地对照',
    desc: '聚焦架构·研发·测试·安全；数据/训练/RAG 明确不做',
    page: 'architecture',
  },
];
