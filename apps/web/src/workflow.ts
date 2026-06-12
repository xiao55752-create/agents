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
    title: '写清任务说明',
    actor: 'user',
    actorLabel: '你来 · 10%',
    description: '填写标题与详情：发生了什么、希望变成什么样、有哪些限制。',
    detail: '说明越具体，智能体越容易改对，也越容易验收。',
  },
  {
    order: 2,
    title: '提交并选择智能体',
    actor: 'user',
    actorLabel: '你来',
    description: '点「开始处理」，系统检查本月用量后进入排队。',
    detail: '月度用量超过 80% 会提醒，用尽后不能再新建任务。',
  },
  {
    order: 3,
    title: 'AI 自动执行',
    actor: 'system',
    actorLabel: 'AI · 80%',
    description: '读任务说明 → 改代码 → 跑测试 → 生成修改方案。',
    detail: '全程有进度条、执行日志与操作记录，可随时取消。',
  },
  {
    order: 4,
    title: '验收修改方案',
    actor: 'both',
    actorLabel: '一起看',
    description: '查看摘要、变更文件和代码差异，再决定是否通过。',
    detail: '建议按：任务说明 → 执行摘要 → 修改方案 → 验收决定的顺序看。',
  },
  {
    order: 5,
    title: '做出验收决定',
    actor: 'user',
    actorLabel: '你来 · 10%',
    description: '可以通过、要求修改，或打回重做（系统会自动重新排队）。',
    detail: '你的修改说明会写入下一轮结果，方便对比前后变化。',
  },
  {
    order: 6,
    title: '合并到主分支',
    actor: 'user',
    actorLabel: '你来',
    description: '验收通过后，再由人在 GitHub 合并。',
    detail: 'agentOS 负责生成和验收前检查，最终合并仍由人控制。',
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
    description: '排队、准备环境，并确认这个智能体能使用哪些能力。',
    detail: '本地模式会模拟完整执行过程，方便演示和验证流程。',
  },
  {
    order: 2,
    title: '理解任务',
    actor: 'system',
    actorLabel: 'AI',
    description: '阅读任务说明和相关代码。',
    detail: '读代码能力包会帮助智能体找到和问题有关的文件。',
  },
  {
    order: 3,
    title: '修改代码',
    actor: 'system',
    actorLabel: 'AI',
    description: '编写修复，并生成变更文件。',
    detail: '改代码能力包会按行为指令尽量只改相关范围。',
  },
  {
    order: 4,
    title: '运行测试',
    actor: 'system',
    actorLabel: 'AI',
    description: '跑自动化测试，确认没有改坏。',
    detail: '测试能力包会模拟自动化测试；测试没过就不会进入人工验收。',
  },
  {
    order: 5,
    title: '生成修改方案',
    actor: 'system',
    actorLabel: 'AI',
    description: '生成摘要、变更文件列表和代码差异，进入待验收。',
    detail: '开 PR 能力包会生成一个可预览的修改方案。',
  },
  {
    order: 6,
    title: '响应验收意见',
    actor: 'both',
    actorLabel: '协作',
    description: '等待人工通过、要求修改或打回；需要重跑时会更新摘要。',
    detail: '打回和修改都会写入操作记录，后续可查看相关指标。',
  },
  {
    order: 7,
    title: '迭代优化',
    actor: 'user',
    actorLabel: '你来',
    description: '根据操作记录和指标，在智能体页调整行为指令、能力包和预算。',
    detail: '形成“配置 → 运行 → 验收 → 优化”的持续改进闭环。',
  },
];

export const WORKFLOW_SUMMARY =
  '10-80-10：你写清任务 → AI 完成大部分工作 → 你验收结果 → 再持续优化智能体。';
