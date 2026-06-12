import type { Page } from './architecture/types';

export type NavPage = Exclude<Page, 'auth'>;

export type ModuleIconId = 'overview' | 'tasks' | 'agents' | 'ai' | 'tokens' | 'architecture';

export interface AppModule {
  page: NavPage;
  label: string;
  icon: ModuleIconId;
  entryDesc?: string;
  inNav: boolean;
  inOverview: boolean;
}

/** 功能模块顺序：总览 → 工作台 → 智能体 → AI 平台 → 用量监控 → 架构 */
export const APP_MODULES: AppModule[] = [
  { page: 'overview', label: '总览', icon: 'overview', inNav: true, inOverview: false },
  {
    page: 'tasks',
    label: '工作台',
    icon: 'tasks',
    entryDesc: '处理任务说明、查看修改方案、人工验收，并追踪日志与操作记录。',
    inNav: true,
    inOverview: true,
  },
  {
    page: 'agents',
    label: '智能体',
    icon: 'agents',
    entryDesc: '配置行为指令、能力包、工具权限、用量预算和优化建议。',
    inNav: true,
    inOverview: true,
  },
  {
    page: 'ai',
    label: 'AI 平台',
    icon: 'ai',
    entryDesc: '数据采集与清洗、模型微调、模型广场选用，并应用到智能体。',
    inNav: true,
    inOverview: true,
  },
  {
    page: 'tokens',
    label: '用量监控',
    icon: 'tokens',
    entryDesc: '查看总消耗、各智能体预算进度和高消耗任务，及时控制风险。',
    inNav: true,
    inOverview: true,
  },
  {
    page: 'architecture',
    label: '架构',
    icon: 'architecture',
    entryDesc: '了解系统分层、能力边界、路线图和运行指标。',
    inNav: true,
    inOverview: true,
  },
];

export const NAV_MODULES = APP_MODULES.filter((m) => m.inNav);
export const OVERVIEW_MODULES = APP_MODULES.filter((m) => m.inOverview);

export function overviewModuleNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}
