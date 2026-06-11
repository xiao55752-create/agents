import { useCallback, useEffect, useState } from 'react';
import {
  createAgent,
  deleteAgent,
  duplicateAgent,
  fetchAgent,
  fetchAgents,
  fetchAgentIterationInsights,
  getAgentBudgetStatus,
  getAgentMonthlySpend,
  updateAgent,
  type Agent,
  type AgentSpec,
} from './api';
import {
  BUILTIN_SKILLS,
  DEFAULT_SPEC,
  MODEL_OPTIONS,
  skillRef,
  TOOL_INFO,
} from './agentConfig';
import { inferSkillRefsFromTools, resolveAgentTools } from './types';
import { AgentIterationTips } from './AgentIterationTips';
import type { IterationInsight } from './iterationInsights';
import { PlatformOverview } from './PlatformOverview';
import { SkillsCatalog } from './SkillsCatalog';

type AgentTab = 'config' | 'skills';

function normalizeSpec(spec: AgentSpec): AgentSpec {
  const skills =
    spec.skills?.length > 0 ? [...spec.skills] : inferSkillRefsFromTools(spec.tools ?? []);
  const tools = resolveAgentTools({ skills, tools: spec.tools });
  return {
    ...spec,
    skills,
    tools: [...tools],
    limits: {
      maxTokens: spec.limits?.maxTokens ?? 100_000,
      timeoutMinutes: spec.limits?.timeoutMinutes ?? 30,
      maxRetries: spec.limits?.maxRetries ?? 2,
      monthlyBudgetTokens: spec.limits?.monthlyBudgetTokens ?? 500_000,
    },
  };
}

function specFromAgent(agent: Agent): AgentSpec {
  return normalizeSpec({ ...agent.spec, name: agent.name });
}

function emptyDraft(): AgentSpec {
  return normalizeSpec({
    ...DEFAULT_SPEC,
    name: 'new-agent',
    skills: [...DEFAULT_SPEC.skills],
    tools: [...DEFAULT_SPEC.tools],
    limits: { ...DEFAULT_SPEC.limits },
  });
}

export function AgentEditor() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentSpec>(emptyDraft());
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<AgentTab>('config');
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [insights, setInsights] = useState<IterationInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const refreshAgents = useCallback(async () => {
    const list = await fetchAgents();
    setAgents(list);
    return list;
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const list = await refreshAgents();
      if (list.length > 0) {
        setSelectedId(list[0]!.id);
        setDraft(specFromAgent(list[0]!));
        setIsNew(false);
      }
      setLoading(false);
    })();
  }, [refreshAgents]);

  useEffect(() => {
    if (!selectedId || isNew) return;
    void fetchAgent(selectedId).then((agent) => {
      setDraft(specFromAgent(agent));
      setDirty(false);
    });
  }, [selectedId, isNew]);

  useEffect(() => {
    if (!selectedId || isNew) {
      setInsights([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setInsightsLoading(true);
      try {
        const list = await fetchAgentIterationInsights(selectedId);
        if (!cancelled) setInsights(list);
      } catch {
        if (!cancelled) setInsights([]);
      } finally {
        if (!cancelled) setInsightsLoading(false);
      }
    };
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [selectedId, isNew]);

  useEffect(() => {
    if (!selectedId || isNew) {
      setMonthlySpend(0);
      return;
    }
    setMonthlySpend(getAgentMonthlySpend(selectedId));
    const t = setInterval(() => setMonthlySpend(getAgentMonthlySpend(selectedId)), 2000);
    return () => clearInterval(t);
  }, [selectedId, isNew]);

  function patchDraft(patch: Partial<AgentSpec>) {
    setDraft((prev) => normalizeSpec({ ...prev, ...patch }));
    setDirty(true);
    setMessage(null);
  }

  function patchLimits(patch: Partial<AgentSpec['limits']>) {
    setDraft((prev) => normalizeSpec({ ...prev, limits: { ...prev.limits, ...patch } }));
    setDirty(true);
    setMessage(null);
  }

  function toggleSkill(skillId: string, version: string) {
    const ref = skillRef(skillId, version);
    setDraft((prev) => {
      const skills = prev.skills.includes(ref)
        ? prev.skills.filter((s) => s !== ref)
        : [...prev.skills, ref];
      if (skills.length === 0) return prev;
      return normalizeSpec({ ...prev, skills });
    });
    setDirty(true);
    setMessage(null);
  }

  function handleSelectAgent(id: string) {
    setSelectedId(id);
    setIsNew(false);
    setTab('config');
    setMessage(null);
  }

  function handleNewAgent() {
    setSelectedId(null);
    setIsNew(true);
    setDraft(emptyDraft());
    setDirty(true);
    setTab('config');
    setMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = normalizeSpec(draft);
      if (isNew) {
        const agent = await createAgent(payload.name, payload);
        setIsNew(false);
        setSelectedId(agent.id);
        setDirty(false);
        setMessage({ type: 'ok', text: '智能体已创建，可去「任务」页新建任务试用' });
      } else if (selectedId) {
        const agent = await updateAgent(selectedId, payload.name, payload);
        setDraft(specFromAgent(agent));
        setDirty(false);
        setMessage({ type: 'ok', text: '保存成功，新建任务时会使用最新 Skill 配置' });
      }
      await refreshAgents();
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    if (!selectedId || isNew) return;
    setMessage(null);
    try {
      const agent = await duplicateAgent(selectedId);
      await refreshAgents();
      setSelectedId(agent.id);
      setIsNew(false);
      setDraft(specFromAgent(agent));
      setDirty(false);
      setMessage({ type: 'ok', text: `已复制为「${agent.name}」` });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : '复制失败' });
    }
  }

  async function handleDelete() {
    if (!selectedId || isNew || agents.length <= 1) return;
    if (!window.confirm(`确定删除智能体「${draft.name}」？相关任务会改用其他智能体。`)) return;
    setMessage(null);
    try {
      await deleteAgent(selectedId);
      const list = await refreshAgents();
      const next = list[0]!;
      setSelectedId(next.id);
      setDraft(specFromAgent(next));
      setIsNew(false);
      setDirty(false);
      setMessage({ type: 'ok', text: '已删除' });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : '删除失败' });
    }
  }

  const budget = draft.limits.monthlyBudgetTokens ?? 500_000;
  const budgetPct = budget > 0 ? Math.min(100, Math.round((monthlySpend / budget) * 100)) : 0;
  const budgetStatus = !isNew && selectedId ? getAgentBudgetStatus(selectedId) : 'ok';
  const budgetExceeded = budgetStatus === 'exceeded';

  if (loading) {
    return <div className="agent-loading">加载智能体…</div>;
  }

  return (
    <div className="agent-layout">
      <aside className="sidebar agent-sidebar">
        <div className="sidebar-head">
          <h2>智能体</h2>
          <span className="count">{agents.length}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-block" onClick={handleNewAgent}>
          + 新建智能体
        </button>
        <ul className="run-list agent-list">
          {agents.map((agent) => {
            const bStatus = getAgentBudgetStatus(agent.id);
            return (
            <li
              key={agent.id}
              className={!isNew && selectedId === agent.id && tab === 'config' ? 'run-item active' : 'run-item'}
              onClick={() => handleSelectAgent(agent.id)}
            >
              <div className="run-item-top">
                <strong>{agent.name}</strong>
                {bStatus !== 'ok' && (
                  <span className={`agent-budget-dot agent-budget-${bStatus}`} title={bStatus === 'exceeded' ? '预算用尽' : '预算预警'} />
                )}
              </div>
              <div className="run-item-sub">{agent.spec.model}</div>
              <div className="run-item-sub">
                {(agent.spec.skills?.length ?? agent.spec.tools.length)} 个 Skill
              </div>
            </li>
          );
          })}
          {isNew && (
            <li className="run-item active">
              <div className="run-item-top">
                <strong>{draft.name || '新智能体'}</strong>
              </div>
              <div className="run-item-sub">未保存</div>
            </li>
          )}
        </ul>
      </aside>

      <main className="main agent-main">
        <PlatformOverview variant="compact" />
        <div className="agent-page-tabs">
          <button
            type="button"
            className={tab === 'config' ? 'agent-page-tab active' : 'agent-page-tab'}
            onClick={() => setTab('config')}
          >
            智能体配置
          </button>
          <button
            type="button"
            className={tab === 'skills' ? 'agent-page-tab active' : 'agent-page-tab'}
            onClick={() => setTab('skills')}
          >
            Skill 目录
          </button>
        </div>

        {tab === 'skills' ? (
          <SkillsCatalog onConfigureAgent={() => setTab('config')} />
        ) : (
          <form className="agent-form" onSubmit={(e) => void handleSave(e)}>
            <div className="agent-form-header">
              <div>
                <h2>{isNew ? '新建智能体' : '编辑智能体'}</h2>
                <p className="agent-form-desc">
                  L1 模型与 Prompt · L5 Skill 挂载 · L2 月度预算流控。智造基地第 6 步「前后端研发」+ 第 8 步「安全防护」的配置入口。
                </p>
              </div>
              <div className="agent-form-actions">
                {message && (
                  <span className={message.type === 'ok' ? 'form-msg ok' : 'form-msg err'}>
                    {message.text}
                  </span>
                )}
                {!isNew && selectedId && (
                  <>
                    <button type="button" className="btn btn-ghost" onClick={() => void handleDuplicate()}>
                      复制
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger-text"
                      disabled={agents.length <= 1}
                      onClick={() => void handleDelete()}
                    >
                      删除
                    </button>
                  </>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
                  {saving ? '保存中…' : '保存配置'}
                </button>
              </div>
            </div>

            <section className="agent-section">
              <h3>基本信息</h3>
              <div className="form-grid">
                <label>
                  智能体名称
                  <input
                    value={draft.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                    placeholder="issue-fix-agent"
                    required
                  />
                  <span className="field-hint">用于识别，建议用英文短名</span>
                </label>
                <label>
                  大模型
                  <select value={draft.model} onChange={(e) => patchDraft({ model: e.target.value })}>
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="agent-section">
              <h3>行为指令（System Prompt）</h3>
              <p className="section-desc">智能体整体策略：怎么理解任务、怎么协作各 Skill。</p>
              <textarea
                className="prompt-area"
                value={draft.systemPrompt}
                onChange={(e) => patchDraft({ systemPrompt: e.target.value })}
                rows={10}
                required
              />
            </section>

            <section className="agent-section">
              <h3>挂载 Skills</h3>
              <p className="section-desc">
                勾选能力包，或切换到「Skill 目录」查看详情。
              </p>
              <div className="tool-grid skill-grid">
                {BUILTIN_SKILLS.map((skill) => {
                  const ref = skillRef(skill.id, skill.version);
                  const checked = draft.skills.includes(ref);
                  return (
                    <label key={ref} className={checked ? 'tool-card skill-card checked' : 'tool-card skill-card'}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSkill(skill.id, skill.version)}
                      />
                      <div>
                        <strong>{skill.name}</strong>
                        <code>{ref}</code>
                        <p>{skill.description}</p>
                        <div className="skill-tool-tags">
                          {skill.tools.map((tool) => (
                            <span key={tool} className="skill-tool-tag">
                              {TOOL_INFO[tool]?.label ?? tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="section-desc skill-derived">
                已推导 Tool 白名单（{draft.tools.length} 个）：
                {draft.tools.map((t) => TOOL_INFO[t as keyof typeof TOOL_INFO]?.label ?? t).join(' · ')}
              </p>
            </section>

            <section className="agent-section">
              <h3>成本流控</h3>
              <p className="section-desc">
                参考 Paperclip 月度预算：超出后新建任务会被拦截（本地模式按本月 Token 累计模拟）。
              </p>
              <div className="budget-panel">
                <div className="budget-stats">
                  <div>
                    <span className="budget-label">本月已用</span>
                    <strong>{monthlySpend.toLocaleString()}</strong>
                    <span className="budget-unit"> tokens</span>
                  </div>
                  <div>
                    <span className="budget-label">月度预算</span>
                    <strong>{budget.toLocaleString()}</strong>
                    <span className="budget-unit"> tokens</span>
                  </div>
                  <div>
                    <span className="budget-label">使用率</span>
                    <strong className={budgetExceeded ? 'budget-warn' : ''}>{budgetPct}%</strong>
                  </div>
                </div>
                <div className="budget-bar" aria-hidden>
                  <div
                    className={`budget-bar-fill${budgetPct >= 90 ? ' budget-bar-warn' : ''}${budgetExceeded ? ' budget-bar-stop' : ''}`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
                {budgetStatus === 'warn' && !budgetExceeded && (
                  <p className="budget-alert budget-alert-warn">预算已用超过 80%，建议关注或提高月度上限。</p>
                )}
                {budgetExceeded && (
                  <p className="budget-alert">预算已用尽：请提高月度预算或等待下月重置后再新建任务。</p>
                )}
              </div>
              <div className="form-grid">
                <label>
                  月度 Token 预算
                  <input
                    type="number"
                    min={10000}
                    max={50000000}
                    step={10000}
                    value={draft.limits.monthlyBudgetTokens ?? 500_000}
                    onChange={(e) => patchLimits({ monthlyBudgetTokens: Number(e.target.value) })}
                  />
                  <span className="field-hint">类似 Paperclip 的 budgetMonthlyCents，此处用 Token 计量</span>
                </label>
              </div>
            </section>

            <section className="agent-section">
              <h3>运行限制</h3>
              <div className="form-grid form-grid-3">
                <label>
                  最大 Token
                  <input
                    type="number"
                    min={1000}
                    max={1000000}
                    step={1000}
                    value={draft.limits.maxTokens}
                    onChange={(e) => patchLimits({ maxTokens: Number(e.target.value) })}
                  />
                  <span className="field-hint">防止单次任务消耗过大</span>
                </label>
                <label>
                  超时（分钟）
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={draft.limits.timeoutMinutes}
                    onChange={(e) => patchLimits({ timeoutMinutes: Number(e.target.value) })}
                  />
                </label>
                <label>
                  最大重试
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={draft.limits.maxRetries}
                    onChange={(e) => patchLimits({ maxRetries: Number(e.target.value) })}
                  />
                </label>
              </div>
            </section>

            {!isNew && selectedId && (
              <p className="agent-id-hint">
                智能体 ID：<code>{selectedId}</code>
              </p>
            )}

            <section className="agent-section agent-iteration">
              <h3>迭代优化（工厂闭环 · 第 5 步）</h3>
              <p className="section-desc">
                根据该智能体关联任务的<strong>审计轨迹</strong>与 Gate 指标自动生成建议；调整后保存并新建任务验证。
              </p>
              <AgentIterationTips insights={insights} loading={insightsLoading && insights.length === 0} />
            </section>
          </form>
        )}
      </main>
    </div>
  );
}
