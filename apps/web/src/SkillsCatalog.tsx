import { BUILTIN_SKILLS, skillRef, TOOL_INFO } from './agentConfig';

interface SkillsCatalogProps {
  onConfigureAgent?: () => void;
}

export function SkillsCatalog({ onConfigureAgent }: SkillsCatalogProps) {
  return (
    <div className="skills-catalog">
      <header className="skills-catalog-header">
        <div>
          <h2>Skill 能力目录</h2>
          <p className="section-desc">
            L5 能力层 · 智造基地「前后端研发」中的 Tool 调用模块。只读目录；在「智能体配置」勾选挂载，自动推导 Tool 白名单。
          </p>
        </div>
        {onConfigureAgent && (
          <button type="button" className="btn btn-primary" onClick={onConfigureAgent}>
            去配置智能体 →
          </button>
        )}
      </header>

      <div className="tool-grid skill-grid">
        {BUILTIN_SKILLS.map((skill) => {
          const ref = skillRef(skill.id, skill.version);
          return (
            <article key={ref} className="tool-card skill-card skill-card-readonly">
              <div>
                <strong>{skill.name}</strong>
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
                    授权：<span>{skill.scopes.join(' · ')}</span>
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="skills-catalog-foot">
        用户自定义 Skill 与 MCP 外部工具为 P2 规划。当前通过 Prompt 约束 + 内置 Skill 组合覆盖 issue-to-pr 场景。
      </p>
    </div>
  );
}
