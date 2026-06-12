import {
  BUILTIN_SKILLS,
  DEFAULT_SKILL_REFS,
  getBuiltinSkill,
  inferSkillRefsFromTools,
  parseSkillRef,
  skillRef,
  type SkillSpec,
  type ToolName,
} from '@agentos/shared';
import { isCustomSkillId, loadCustomSkills } from './store';

export function listAllSkills(): SkillSpec[] {
  return [...BUILTIN_SKILLS, ...loadCustomSkills()];
}

export function getSkill(ref: string): SkillSpec | undefined {
  const builtin = getBuiltinSkill(ref);
  if (builtin) return builtin;

  const { id } = parseSkillRef(ref);
  return loadCustomSkills().find((skill) => skillRef(skill.id, skill.version) === ref || skill.id === id);
}

export function isCustomSkill(skill: SkillSpec): boolean {
  return isCustomSkillId(skill.id);
}

export function resolveAgentTools(input: { skills?: string[]; tools?: string[] }): ToolName[] {
  const skills =
    input.skills && input.skills.length > 0
      ? [...input.skills]
      : input.tools && input.tools.length > 0
        ? inferSkillRefsFromTools(input.tools)
        : [...DEFAULT_SKILL_REFS];

  if (skills.length === 0) {
    return (input.tools ?? []).filter((tool): tool is ToolName =>
      ['read_file', 'write_file', 'shell', 'run_tests', 'open_draft_pr'].includes(tool),
    );
  }

  const tools = new Set<ToolName>();
  for (const ref of skills) {
    const skill = getSkill(ref);
    if (!skill) continue;
    for (const tool of skill.tools) tools.add(tool);
  }

  if (tools.size === 0) {
    return (input.tools ?? []).filter((tool): tool is ToolName =>
      ['read_file', 'write_file', 'shell', 'run_tests', 'open_draft_pr'].includes(tool),
    );
  }

  return [...tools];
}
