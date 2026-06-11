import { DEFAULT_AGENT, DEFAULT_SKILL_REFS, type ToolName } from '@agentos/shared';

export { BUILTIN_SKILLS, DEFAULT_SKILL_REFS, getBuiltinSkill, skillRef } from '@agentos/shared';

export const AVAILABLE_TOOLS = [
  'read_file',
  'write_file',
  'shell',
  'run_tests',
  'open_draft_pr',
] as const satisfies readonly ToolName[];

export const TOOL_INFO: Record<
  (typeof AVAILABLE_TOOLS)[number],
  { label: string; description: string }
> = {
  read_file: { label: '读代码', description: '阅读仓库里的源代码文件' },
  write_file: { label: '改代码', description: '修改并保存代码文件' },
  shell: { label: '跑命令', description: '在沙箱内执行 shell 命令（有白名单）' },
  run_tests: { label: '跑测试', description: '运行项目的自动化测试' },
  open_draft_pr: { label: '开 PR', description: '创建 Draft Pull Request' },
};

export const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4（推荐）' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4（更强）' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini（更省）' },
];

export const DEFAULT_SPEC = {
  name: DEFAULT_AGENT.name,
  model: DEFAULT_AGENT.model,
  systemPrompt:
    '你是工程智能体。根据 Issue 描述修改代码，运行测试，并创建 Draft PR。\n\n规则：\n- 只改与问题相关的文件\n- 测试不过不要开 PR\n- 禁止 merge 到 main\n- 不要修改 CI 配置或 .env',
  skills: [...DEFAULT_SKILL_REFS],
  tools: [...DEFAULT_AGENT.tools],
  limits: { ...DEFAULT_AGENT.limits },
};
