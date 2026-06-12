import type { OnboardingStep } from './types';

const ONBOARDING_KEY = 'agentos_onboarding_done';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '欢迎使用 agentOS',
    description: '这是一个智能体工程工作台：你写任务，AI 做大部分工作，你来验收结果。',
    tip: '不用一次学完，右下角助手随时能帮你。',
  },
  {
    id: 'overview',
    title: '先看总览',
    description: '总览页展示任务数量、待验收事项和常用入口，适合每天打开先看一眼。',
    page: 'overview',
    tip: '没有任务时，从「新建任务说明」开始最直观。',
  },
  {
    id: 'tasks',
    title: '在工作台处理任务',
    description: '创建任务说明 → 智能体生成修改方案 → 你确认通过、要求修改或打回。',
    page: 'tasks',
    tip: '待验收任务会自动置顶，点进去就能验收。',
  },
  {
    id: 'agents',
    title: '配置智能体',
    description: '选择模型、写行为指令、勾选能力包，并设置每月用量预算。',
    page: 'agents',
    tip: '新手先用默认智能体即可，熟悉后再调整。',
  },
  {
    id: 'ai',
    title: 'AI 平台：数据与模型',
    description: '需要微调时：数据工场采集清洗 → 训练中心微调 → 模型广场选用。',
    page: 'ai',
    tip: '工作台的 task/审计会自动同步到数据工场，可直接用来构建数据集。',
  },
  {
    id: 'tokens',
    title: '用量监控',
    description: '查看各智能体的 token 消耗、预算进度和高消耗任务，及时控制风险。',
    page: 'tokens',
    tip: '预算在智能体配置里设置，超过 80% 会在顶部通知提醒。',
  },
  {
    id: 'assistant',
    title: '有问题就问助手',
    description: '右下角「协同助手」可以用对话方式带你操作，降低学习成本。',
    tip: '也可以点顶部「新手引导」随时重温。',
  },
];

export function isOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}
