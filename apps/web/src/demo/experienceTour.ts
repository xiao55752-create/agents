import type { Page } from '../architecture/types';
import type { AiTab } from '../assistant/types';

export interface ExperienceTourStep {
  id: string;
  title: string;
  description: string;
  tip: string;
  page: Page;
  /** 与顶栏 / Hero 快捷入口一致的模块名 */
  moduleLabel?: string;
  aiTab?: AiTab;
  /** 进入工作台时自动选中待验收任务 */
  focusPendingRun?: boolean;
  /** 高亮页面内元素，值为 data-tour 属性 */
  spotlight?: string;
}

export const EXPERIENCE_TOUR_STEPS: ExperienceTourStep[] = [
  {
    id: 'welcome',
    title: '5 分钟完整体验',
    description: '已填充演示任务与 AI 平台数据。下方迷你仪表盘可一眼看到待验收与 Token 走势，接下来按步骤走完核心流程。',
    tip: '高亮区域是当前步骤要关注的位置；顶栏与总览快捷入口会同步标记当前模块。',
    page: 'overview',
    moduleLabel: '总览',
    spotlight: 'overview-dashboard',
  },
  {
    id: 'approve-list',
    title: '第一步：找到待验收任务',
    description: '左侧任务列表里，带橙色标记的「待验收」任务已自动选中。确认这就是你要验收的修改方案。',
    tip: '若列表被筛选隐藏，可点「待验收」筛选或清空搜索条件。',
    page: 'tasks',
    moduleLabel: '工作台',
    focusPendingRun: true,
    spotlight: 'workbench-pending-run',
  },
  {
    id: 'approve-gate',
    title: '第一步：点击通过验收',
    description: '右侧验收区展示修改方案与检查结果。请点击「通过」完成人工确认，智能体才会继续后续流程。',
    tip: '这是 agentOS 的核心：智能体不能自行上线，必须等你点头。',
    page: 'tasks',
    moduleLabel: '工作台',
    focusPendingRun: true,
    spotlight: 'approval-gate',
  },
  {
    id: 'agents',
    title: '第二步：查看智能体',
    description: '智能体页可调整模型、行为指令、能力包和月度预算。拓扑图支持键盘切换与 Enter 勾选能力包。',
    tip: '能力包目录支持创建自定义能力包。',
    page: 'agents',
    moduleLabel: '智能体',
    spotlight: 'agent-config',
  },
  {
    id: 'ai',
    title: '第三步：AI 平台',
    description: '数据工场已有同步数据与清洗好的训练集；训练中心有已完成的微调任务；模型广场可应用到智能体。',
    tip: '可切换 Tab 查看训练中心与模型广场。',
    page: 'ai',
    moduleLabel: 'AI 平台',
    aiTab: 'data',
    spotlight: 'ai-platform',
  },
  {
    id: 'tokens',
    title: '第四步：用量监控',
    description: '查看演示任务的 Token 消耗与各智能体预算进度，顶部通知也会在接近上限时提醒。',
    tip: '预算在智能体配置里设置，80% 预警、100% 停止新任务。',
    page: 'tokens',
    moduleLabel: '用量监控',
    spotlight: 'token-monitor',
  },
  {
    id: 'done',
    title: '体验完成',
    description: '你已经走完任务闭环 + AI 平台 + 用量监控。接下来会弹出本次体验总结。',
    tip: '顶部「新手引导」可随时重温各模块说明。',
    page: 'overview',
    moduleLabel: '总览',
  },
];

const EXPERIENCE_DONE_KEY = 'agentos_experience_tour_done';

export interface ExperienceTourProgressGroup {
  id: string;
  label: string;
  stepIds: string[];
}

/** 合并重复模块标签，用于引导进度条 */
export const EXPERIENCE_TOUR_PROGRESS_GROUPS: ExperienceTourProgressGroup[] = [
  { id: 'overview', label: '总览', stepIds: ['welcome'] },
  { id: 'approve', label: '验收', stepIds: ['approve-list', 'approve-gate'] },
  { id: 'agents', label: '智能体', stepIds: ['agents'] },
  { id: 'ai', label: 'AI 平台', stepIds: ['ai'] },
  { id: 'tokens', label: '用量', stepIds: ['tokens'] },
  { id: 'done', label: '总结', stepIds: ['done'] },
];

export function groupIndexForStep(stepIndex: number): number {
  const stepId = EXPERIENCE_TOUR_STEPS[stepIndex]?.id;
  if (!stepId) return 0;
  const index = EXPERIENCE_TOUR_PROGRESS_GROUPS.findIndex((group) => group.stepIds.includes(stepId));
  return index === -1 ? 0 : index;
}

export function stepIndexForGroup(groupIndex: number): number {
  const group = EXPERIENCE_TOUR_PROGRESS_GROUPS[groupIndex];
  if (!group) return 0;
  const index = EXPERIENCE_TOUR_STEPS.findIndex((step) => step.id === group.stepIds[0]);
  return index === -1 ? 0 : index;
}

export function isGroupComplete(groupIndex: number, stepIndex: number): boolean {
  const group = EXPERIENCE_TOUR_PROGRESS_GROUPS[groupIndex];
  if (!group) return false;
  const lastStepId = group.stepIds[group.stepIds.length - 1];
  const lastIndex = EXPERIENCE_TOUR_STEPS.findIndex((step) => step.id === lastStepId);
  return lastIndex !== -1 && stepIndex >= lastIndex;
}

export function subStepLabel(stepIndex: number): string | null {
  const groupIndex = groupIndexForStep(stepIndex);
  const group = EXPERIENCE_TOUR_PROGRESS_GROUPS[groupIndex];
  if (!group || group.stepIds.length <= 1) return null;
  const stepId = EXPERIENCE_TOUR_STEPS[stepIndex]?.id;
  const subIndex = group.stepIds.indexOf(stepId ?? '');
  if (subIndex === -1) return null;
  return `${subIndex + 1}/${group.stepIds.length}`;
}

export function isExperienceTourDone(): boolean {
  return localStorage.getItem(EXPERIENCE_DONE_KEY) === '1';
}

export function markExperienceTourDone() {
  localStorage.setItem(EXPERIENCE_DONE_KEY, '1');
}

export function resetExperienceTourDone() {
  localStorage.removeItem(EXPERIENCE_DONE_KEY);
}
