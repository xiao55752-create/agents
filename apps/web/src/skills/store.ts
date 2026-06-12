import { skillRef, type SkillSpec, type ToolName } from '@agentos/shared';

const STORAGE_KEY = 'agentos-custom-skills-v1';

export interface CustomSkillInput {
  name: string;
  description: string;
  tools: ToolName[];
  prompt?: string;
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'skill';
}

function loadRaw(): SkillSpec[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SkillSpec[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(skills: SkillSpec[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
}

export function loadCustomSkills(): SkillSpec[] {
  return loadRaw().map((skill) => ({ ...skill, tools: [...skill.tools] }));
}

export function isCustomSkillId(id: string): boolean {
  return id.startsWith('custom-');
}

export function createCustomSkill(input: CustomSkillInput): SkillSpec {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) throw new Error('请填写能力包名称');
  if (!description) throw new Error('请填写能力包说明');
  if (input.tools.length === 0) throw new Error('请至少选择一个工具');

  const existing = loadRaw();
  let slug = slugify(name);
  let id = `custom-${slug}`;
  let suffix = 1;
  while (existing.some((item) => item.id === id)) {
    suffix += 1;
    id = `custom-${slug}-${suffix}`;
  }

  const skill: SkillSpec = {
    id,
    version: '1.0.0',
    name,
    description,
    tools: [...input.tools],
    prompt: input.prompt?.trim() || undefined,
    scopes: ['custom:demo'],
  };

  persist([skill, ...existing]);
  return skill;
}

export function deleteCustomSkill(id: string): void {
  if (!isCustomSkillId(id)) throw new Error('只能删除自定义能力包');
  persist(loadRaw().filter((skill) => skill.id !== id));
}

export function customSkillRef(skill: SkillSpec): string {
  return skillRef(skill.id, skill.version);
}
