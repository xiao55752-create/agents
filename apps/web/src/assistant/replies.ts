import type { AssistantAction, AssistantContext, AssistantReply } from './types';
import { NAV_MODULES } from '../modules';

const PAGE_HINT: Record<AssistantContext['page'], string> = {
  auth: '请先登录。',
  overview: '你现在在总览页，适合查看整体状态和选择下一步。',
  tasks: '你现在在工作台，可以新建任务、查看修改方案并做人工验收。',
  agents: '你现在在智能体页，可以配置模型、行为指令和能力包。',
  ai: '你现在在 AI 平台，可进行数据采集、清洗、微调和模型选用。',
  tokens: '你现在在用量监控页，可以查看各智能体的 token 消耗和预算风险。',
  architecture: '你现在在架构页，适合了解系统分层和能力边界。',
};

export const QUICK_PROMPTS = [
  '我是新手，从哪里开始？',
  '开始 5 分钟完整体验',
  '待验收的任务在哪？',
  '体验完整微调流程',
  '能力包在哪里创建？',
];

function contextHint(ctx: AssistantContext): string {
  const parts: string[] = [PAGE_HINT[ctx.page]];

  if (ctx.selectedRun) {
    parts.push(`当前选中任务「${ctx.selectedRun.title}」(${statusLabel(ctx.selectedRun.status)})。`);
  }
  if (ctx.pendingApprovalCount > 0) {
    parts.push(`另有 ${ctx.pendingApprovalCount} 个待验收修改方案。`);
  }
  if (ctx.budgetWarningCount > 0) {
    parts.push(`${ctx.budgetWarningCount} 个智能体预算接近或已达上限。`);
  }
  return parts.join(' ');
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    needs_approval: '待验收',
    running: '进行中',
    completed: '已完成',
    failed: '失败',
    pending: '排队中',
    queued: '排队中',
    provisioning: '准备中',
    pr_opened: '方案已生成',
    cancelled: '已取消',
  };
  return map[status] ?? status;
}

export function buildWelcomeReply(ctx: AssistantContext): AssistantReply {
  if (ctx.totalRuns === 0) {
    return {
      text: '你好，我是协同助手。你还没有任务，建议从「新建第一个任务」开始，我会一步步带你走。',
      actions: [
        { type: 'create_task' },
        { type: 'open_onboarding' },
        { type: 'navigate', page: 'agents', label: '先看智能体配置' },
      ],
    };
  }

  if (ctx.selectedRun?.status === 'needs_approval') {
    return {
      text: `你正在查看待验收任务「${ctx.selectedRun.title}」。向下滚动可看到修改方案，选择通过、要求修改或打回。`,
      actions: [{ type: 'open_selected_task' }, { type: 'navigate', page: 'tokens', label: '查看用量' }],
    };
  }

  if (ctx.pendingApprovalCount > 0) {
    return {
      text: `你好，当前有 ${ctx.pendingApprovalCount} 个修改方案等待验收。建议先去工作台处理。`,
      actions: [
        { type: 'focus_pending' },
        { type: 'navigate', page: 'tokens', label: '查看用量' },
      ],
    };
  }

  if (ctx.budgetWarningCount > 0 && ctx.page !== 'tokens') {
    return {
      text: `有 ${ctx.budgetWarningCount} 个智能体预算接近或已达上限，建议先去用量监控查看。`,
      actions: [
        { type: 'navigate', page: 'tokens', label: '用量监控' },
        { type: 'navigate', page: 'agents', label: '调整预算' },
      ],
    };
  }

  return {
    text: `${contextHint(ctx)} 需要我带你做什么，直接说或点下面快捷问题。`,
    actions: [
      { type: 'navigate', page: 'overview', label: '回总览' },
      { type: 'create_task' },
      { type: 'open_ai', tab: 'data' },
    ],
  };
}

export function replyToUser(input: string, ctx: AssistantContext): AssistantReply {
  const q = input.trim().toLowerCase();

  if (/5\s*分钟|完整体验|填充演示|演示数据/.test(q)) {
    return {
      text: '点总览的「开始 5 分钟体验」，会自动填充待验收任务、AI 平台数据集和微调模型，并打开分步引导。',
      actions: [{ type: 'navigate', page: 'overview', label: '去总览' }],
    };
  }

  if (/新手|开始|入门|怎么用|如何使用|不会/.test(q)) {
    return {
      text: '推荐路径：① 总览了解全貌 → ② 新建任务说明 → ③ 工作台验收 → ④ 需要微调再去 AI 平台 → ⑤ 用量监控看预算。',
      actions: [
        { type: 'open_onboarding' },
        { type: 'create_task' },
        { type: 'navigate', page: 'overview', label: '打开总览' },
      ],
    };
  }

  if (/微调流程|完整微调|数据.*训练.*模型/.test(q)) {
    return {
      text: '完整微调演示：① 数据工场勾选「工作台任务说明/验收记录」→ 生成数据集并清洗 → ② 训练中心创建任务 → ③ 完成后到模型广场「应用到智能体」。',
      actions: [
        { type: 'open_ai', tab: 'data' },
        { type: 'open_ai', tab: 'training' },
        { type: 'open_ai', tab: 'models' },
      ],
    };
  }

  if (/新建|创建|第一个任务|任务说明/.test(q)) {
    return {
      text: '我来带你新建任务。点击后会打开表单，填「问题标题 + 详情 + 验收标准」即可，默认智能体就能跑通演示。',
      actions: [{ type: 'create_task' }],
    };
  }

  if (/待验收|验收|修改方案|gate|通过|打回/.test(q)) {
    if (ctx.selectedRun?.status === 'needs_approval') {
      return {
        text: `当前任务「${ctx.selectedRun.title}」就在待验收状态。请在详情区查看修改方案并做出决定。`,
        actions: [{ type: 'open_selected_task' }],
      };
    }
    return {
      text:
        ctx.pendingApprovalCount > 0
          ? `有 ${ctx.pendingApprovalCount} 个任务待验收。我可以帮你定位到第一个待验收任务。`
          : '当前没有待验收任务。新建任务后，智能体生成修改方案时会出现在这里。',
      actions: ctx.pendingApprovalCount > 0 ? [{ type: 'focus_pending' }] : [{ type: 'navigate', page: 'tasks', label: '去工作台' }],
    };
  }

  if (/模型|微调|训练|模型广场|广场/.test(q)) {
    return {
      text: '模型相关在 AI 平台：数据工场准备数据 → 训练中心微调 → 模型广场选模型。微调完成后会自动发布到模型广场。',
      actions: [
        { type: 'open_ai', tab: 'data' },
        { type: 'open_ai', tab: 'training' },
        { type: 'open_ai', tab: 'models' },
      ],
    };
  }

  if (/数据|采集|清洗|数据集/.test(q)) {
    return {
      text: '数据流程：先在「数据工场」创建数据源并采集。工作台的 task 和审计记录会自动同步过来，也可手动导入。',
      actions: [
        { type: 'open_ai', tab: 'data' },
        { type: 'open_ai', tab: 'training' },
      ],
    };
  }

  if (/能力包|skill|工具权限|创建能力包/.test(q)) {
    return {
      text: '创建能力包：智能体页 →「能力包目录」→ 填写名称和工具后创建。使用时回到「智能体配置」勾选即可。',
      actions: [
        { type: 'navigate', page: 'agents', label: '去智能体页' },
        { type: 'open_onboarding' },
      ],
    };
  }

  if (/token|用量|预算|成本/.test(q)) {
    return {
      text: '用量和预算在「用量监控」页查看。单个智能体的预算在智能体配置里设置，超过 80% 会预警。',
      actions: [
        { type: 'navigate', page: 'tokens', label: '用量监控' },
        { type: 'navigate', page: 'agents', label: '调整预算' },
      ],
    };
  }

  if (/智能体|agent|配置|prompt|行为指令/.test(q)) {
    return {
      text: '智能体页可以改模型、行为指令、能力包和预算。保存后，新建任务就会用最新配置。',
      actions: [{ type: 'navigate', page: 'agents', label: '去智能体页' }],
    };
  }

  if (/通知|提醒/.test(q)) {
    return {
      text: '顶部铃铛会提醒待验收、任务失败和预算风险。你也可以在这里问我下一步做什么。',
      actions: [{ type: 'navigate', page: 'tasks', label: '去工作台' }],
    };
  }

  if (/引导|教程|帮助/.test(q)) {
    return {
      text: '我可以打开分步新手引导，带你快速了解总览、工作台、智能体、AI 平台与用量监控。',
      actions: [{ type: 'open_onboarding' }],
    };
  }

  if (/当前|这个任务|选中/.test(q) && ctx.selectedRun) {
    return {
      text: `你选中的任务是「${ctx.selectedRun.title}」，状态：${statusLabel(ctx.selectedRun.status)}。`,
      actions:
        ctx.selectedRun.status === 'needs_approval'
          ? [{ type: 'open_selected_task' }]
          : [{ type: 'navigate', page: 'tasks', label: '留在工作台' }],
    };
  }

  return {
    text: `${contextHint(ctx)} 你可以试试：新建任务、去工作台验收、体验微调流程，或输入「新手引导」。`,
    actions: [
      { type: 'create_task' },
      { type: 'focus_pending' },
      { type: 'open_ai', tab: 'data' },
      { type: 'open_onboarding' },
    ],
  };
}

export function actionLabel(action: AssistantAction): string {
  switch (action.type) {
    case 'create_task':
      return '新建任务';
    case 'open_onboarding':
      return '新手引导';
    case 'focus_pending':
      return '定位待验收任务';
    case 'open_selected_task':
      return '定位当前任务';
    case 'navigate':
      return action.label ?? pageLabel(action.page);
    case 'open_ai':
      if (action.tab === 'data') return '数据工场';
      if (action.tab === 'training') return '训练中心';
      return '模型广场';
    default:
      return '前往';
  }
}

function pageLabel(page: AssistantContext['page']): string {
  const module = NAV_MODULES.find((item) => item.page === page);
  if (module) return module.label;
  return page === 'auth' ? '登录' : page;
}
