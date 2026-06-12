import { useMemo, useState, type FormEvent } from 'react';
import { AVAILABLE_TOOLS, skillRef, TOOL_INFO } from './agentConfig';
import { isCustomSkill, listAllSkills } from './skills/catalog';
import { createCustomSkill, deleteCustomSkill, type CustomSkillInput } from './skills/store';
import type { ToolName } from './types';

interface SkillsCatalogProps {
  onConfigureAgent?: () => void;
}

const EMPTY_FORM: CustomSkillInput = {
  name: '',
  description: '',
  tools: [],
  prompt: '',
};

export function SkillsCatalog({ onConfigureAgent }: SkillsCatalogProps) {
  const [skills, setSkills] = useState(() => listAllSkills());
  const [form, setForm] = useState<CustomSkillInput>(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);

  const customSkills = useMemo(() => skills.filter(isCustomSkill), [skills]);

  function reload() {
    setSkills(listAllSkills());
  }

  function toggleTool(tool: ToolName) {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.includes(tool) ? prev.tools.filter((item) => item !== tool) : [...prev.tools, tool],
    }));
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      createCustomSkill(form);
      setForm(EMPTY_FORM);
      reload();
      setMessage('自定义能力包已创建，可在下方目录查看，并到「智能体配置」里勾选使用。');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '创建失败');
    }
  }

  function handleDelete(id: string) {
    try {
      deleteCustomSkill(id);
      reload();
      setMessage('已删除自定义能力包。若智能体仍引用该能力包，请回到配置页调整。');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '删除失败');
    }
  }

  return (
    <div className="skills-catalog">
      <header className="skills-catalog-header">
        <div>
          <h2>能力包目录</h2>
          <p className="section-desc">
            能力包决定智能体能做什么。内置能力包可直接使用；也可以在这里创建自定义能力包，再到「智能体配置」里勾选。
          </p>
        </div>
        {onConfigureAgent && (
          <button type="button" className="btn btn-primary" onClick={onConfigureAgent}>
            去配置智能体 →
          </button>
        )}
      </header>

      <section className="skill-create-panel">
        <div className="skill-create-head">
          <h3>创建自定义能力包</h3>
          <p>给能力包起名、写说明，并勾选允许使用的工具。保存后可在智能体配置里挂载。</p>
        </div>
        <form className="skill-create-form" onSubmit={handleCreate}>
          <label>
            <span>名称</span>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="例如：只读排查"
            />
          </label>
          <label>
            <span>说明</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="描述这个能力包适合解决什么问题"
              rows={3}
            />
          </label>
          <label>
            <span>补充指令（可选）</span>
            <textarea
              value={form.prompt ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))}
              placeholder="例如：只读相关文件，不要修改代码"
              rows={2}
            />
          </label>
          <fieldset className="skill-create-tools">
            <legend>允许使用的工具</legend>
            <div className="skill-create-tool-grid">
              {AVAILABLE_TOOLS.map((tool) => (
                <label key={tool} className={form.tools.includes(tool) ? 'skill-create-tool checked' : 'skill-create-tool'}>
                  <input type="checkbox" checked={form.tools.includes(tool)} onChange={() => toggleTool(tool)} />
                  <strong>{TOOL_INFO[tool].label}</strong>
                  <span>{TOOL_INFO[tool].description}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="skill-create-actions">
            <button type="submit" className="btn btn-primary">
              创建能力包
            </button>
          </div>
        </form>
        {message && <p className="skill-create-message">{message}</p>}
      </section>

      <div className="tool-grid skill-grid">
        {skills.map((skill) => {
          const ref = skillRef(skill.id, skill.version);
          const custom = isCustomSkill(skill);
          return (
            <article
              key={ref}
              className={custom ? 'tool-card skill-card skill-card-readonly skill-card-custom' : 'tool-card skill-card skill-card-readonly'}
            >
              <div>
                <div className="skill-card-head">
                  <strong>{skill.name}</strong>
                  {custom ? <em className="skill-custom-badge">自定义</em> : <em className="skill-builtin-badge">内置</em>}
                </div>
                <code>{ref}</code>
                <p>{skill.description}</p>
                {skill.prompt && <p className="skill-prompt-hint">{skill.prompt}</p>}
                <div className="skill-tool-tags">
                  {skill.tools.map((tool) => (
                    <span key={tool} className="skill-tool-tag">
                      {TOOL_INFO[tool]?.label ?? tool}
                    </span>
                  ))}
                </div>
                {skill.scopes && (
                  <p className="skill-scope">
                    可用范围：<span>{skill.scopes.join(' · ')}</span>
                  </p>
                )}
                {custom && (
                  <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={() => handleDelete(skill.id)}>
                    删除
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="skills-catalog-foot">
        自定义能力包保存在本地浏览器。演示模式下工具权限会随能力包生效；真实运行时需后端注册（规划中）。
      </p>
    </div>
  );
}
