/** 完成一次智能体工作的完整流程 — 面向普通用户的说明 */

export type WorkflowActor = 'user' | 'system' | 'both';

export interface WorkflowStep {
  order: number;
  title: string;
  actor: WorkflowActor;
  actorLabel: string;
  description: string;
  detail: string;
  optional?: boolean;
}

/** 用户视角：10-80-10 之「意图 + 验收」 */
export const USER_WORKFLOW: WorkflowStep[] = [
  {
    order: 1,
    title: '写清 Issue 意图',
    actor: 'user',
    actorLabel: '你来 · 10%',
    description: '填写标题与详情：复现步骤、期望行为、约束条件。',
    detail: '智造基地第 1 步「场景需求」的落地——意图越具体，AI 越容易改对。',
  },
  {
    order: 2,
    title: '提交并选择智能体',
    actor: 'user',
    actorLabel: '你来',
    description: '点「开始处理」，系统检查预算后进入排队。',
    detail: '月度 Token 超 80% 会预警，用尽则无法新建任务。',
  },
  {
    order: 3,
    title: 'AI 自动执行',
    actor: 'system',
    actorLabel: 'AI · 80%',
    description: '读 Issue → 改代码 → 跑测试 → 生成 Draft PR。',
    detail: '全程有进度条、执行日志与审计轨迹，可随时取消。',
  },
  {
    order: 4,
    title: '验收 Draft PR',
    actor: 'both',
    actorLabel: '一起看',
    description: '查看变更文件、摘要与 diff，进入 Human Gate。',
    detail: 'Issue 意图 → 执行摘要 → PR 预览 → Gate，按此顺序验收。',
  },
  {
    order: 5,
    title: 'Gate 决策',
    actor: 'user',
    actorLabel: '你来 · 10%',
    description: '通过 / 要求修改 / 打回重做（自动重新排队）。',
    detail: '修改说明写入下一轮 PR；打回像 Optio 一样重跑而非直接失败。',
  },
  {
    order: 6,
    title: '合并到主分支',
    actor: 'user',
    actorLabel: '你来',
    description: '验收通过后在 GitHub 人工 merge。',
    detail: 'agentOS 负责 Draft PR 与 Gate，最终 merge 仍由人控制。',
    optional: true,
  },
];

/** AI 在后台实际执行的子步骤 */
export const AGENT_WORKFLOW: WorkflowStep[] = [
  {
    order: 1,
    title: '领取任务',
    actor: 'system',
    actorLabel: '系统',
    description: '排队 → 准备环境 → 解析 Skill 白名单。',
    detail: 'Reconcile 状态机驱动，防任务丢失（本地 Mock）。',
  },
  {
    order: 2,
    title: '理解 Issue',
    actor: 'system',
    actorLabel: 'AI',
    description: '阅读标题、详情与相关源码。',
    detail: 'code-read Skill：定位与问题相关的文件。',
  },
  {
    order: 3,
    title: '修改代码',
    actor: 'system',
    actorLabel: 'AI',
    description: '编写修复并保存到分支。',
    detail: 'code-fix Skill：只改相关范围，遵守 Prompt 约束。',
  },
  {
    order: 4,
    title: '运行测试',
    actor: 'system',
    actorLabel: 'AI',
    description: '跑自动化测试，确认没有改坏。',
    detail: 'test-run Skill；测试未通过不进 Gate。标题含「测试失败」可复现失败场景。',
  },
  {
    order: 5,
    title: '开 Draft PR',
    actor: 'system',
    actorLabel: 'AI',
    description: '生成 PR 摘要、变更文件列表，进入待验收。',
    detail: 'github-pr Skill；状态变为「Draft PR 待验收」。',
  },
  {
    order: 6,
    title: '响应 Gate',
    actor: 'both',
    actorLabel: '协作',
    description: '等待人工通过、修改或打回；按说明重跑时更新摘要。',
    detail: '打回/修改会写入审计，架构页可查看打回率与修改率。',
  },
  {
    order: 7,
    title: '迭代优化',
    actor: 'user',
    actorLabel: '你来',
    description: '根据审计与指标，在智能体页调 Prompt / Skill / 预算。',
    detail: 'Agent 工厂闭环第 5 步——配置 → 运行 → 验收 → 迭代。',
  },
];

export const WORKFLOW_SUMMARY =
  '10-80-10：你写 Issue 意图 → AI 出 Draft PR → 你 Gate 验收 → 智能体页迭代优化。';
