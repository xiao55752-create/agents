import { isToolName, type ToolName } from './tools.js';

export interface SkillSpec {
  id: string;
  version: string;
  name: string;
  description: string;
  tools: ToolName[];
  prompt?: string;
  scopes?: string[];
}

/** 内置 Skill 目录（P2 只读；暂不支持用户创建） */
export const BUILTIN_SKILLS: SkillSpec[] = [
  {
    id: 'code-read',
    version: '1.0.0',
    name: '读代码',
    description: '阅读 Issue 相关源码，不修改文件',
    tools: ['read_file'],
    prompt: '只读相关文件，不要写入或执行命令。',
    scopes: ['repo:read'],
  },
  {
    id: 'code-fix',
    version: '1.0.0',
    name: '改代码',
    description: '修改源码并在沙箱内执行必要命令',
    tools: ['write_file', 'shell'],
    prompt: '只改与 Issue 相关的文件，禁止改 CI 与 .env。',
    scopes: ['repo:write', 'shell:limited'],
  },
  {
    id: 'test-run',
    version: '1.0.0',
    name: '跑测试',
    description: '运行自动化测试，确认修改未引入回归',
    tools: ['run_tests', 'shell'],
    prompt: '测试不过时不要继续开 PR。',
    scopes: ['repo:read', 'shell:test'],
  },
  {
    id: 'github-pr',
    version: '1.0.0',
    name: '开 PR',
    description: '创建 Draft Pull Request，等待人工审查',
    tools: ['open_draft_pr'],
    prompt: '只开 Draft PR，禁止 merge 到 main。',
    scopes: ['pr:draft'],
  },
];

export const DEFAULT_SKILL_REFS = BUILTIN_SKILLS.map((s) => skillRef(s.id, s.version));

const skillByKey = new Map(BUILTIN_SKILLS.map((s) => [skillRef(s.id, s.version), s]));

for (const skill of BUILTIN_SKILLS) {
  skillByKey.set(skill.id, skill);
}

export function skillRef(id: string, version?: string): string {
  if (version) return `${id}@${version}`;
  const skill = BUILTIN_SKILLS.find((s) => s.id === id);
  if (!skill) return id;
  return `${skill.id}@${skill.version}`;
}

export function parseSkillRef(ref: string): { id: string; version?: string } {
  const at = ref.indexOf('@');
  if (at === -1) return { id: ref };
  return { id: ref.slice(0, at), version: ref.slice(at + 1) };
}

export function getBuiltinSkill(ref: string): SkillSpec | undefined {
  const exact = skillByKey.get(ref);
  if (exact) return exact;
  const { id } = parseSkillRef(ref);
  return skillByKey.get(id);
}

export function resolveSkillsToTools(skillRefs: string[]): { ok: true; tools: ToolName[] } | { ok: false; error: string } {
  if (skillRefs.length === 0) {
    return { ok: false, error: 'at least one skill is required' };
  }

  const tools = new Set<ToolName>();
  for (const ref of skillRefs) {
    const skill = getBuiltinSkill(ref);
    if (!skill) return { ok: false, error: `unknown skill: ${ref}` };
    for (const tool of skill.tools) tools.add(tool);
  }

  return { ok: true, tools: [...tools] };
}

export function inferSkillRefsFromTools(tools: string[]): string[] {
  const refs: string[] = [];
  for (const skill of BUILTIN_SKILLS) {
    if (skill.tools.some((t) => tools.includes(t))) {
      refs.push(skillRef(skill.id, skill.version));
    }
  }
  return refs;
}

export function normalizeAgentSkills(input: { skills?: string[]; tools?: string[] }): string[] {
  if (input.skills && input.skills.length > 0) return [...input.skills];
  if (input.tools && input.tools.length > 0) return inferSkillRefsFromTools(input.tools);
  return [...DEFAULT_SKILL_REFS];
}

export function resolveAgentTools(input: { skills?: string[]; tools?: string[] }): ToolName[] {
  const skills = normalizeAgentSkills(input);
  const resolved = resolveSkillsToTools(skills);
  if (resolved.ok) return resolved.tools;
  return (input.tools ?? []).filter(isToolName);
}
