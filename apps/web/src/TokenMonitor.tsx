import { formatMetricUsd } from '@agentos/shared';
import type { Agent, PlatformMetrics, Run } from './types';
import { friendlyTaskTitle } from './friendly';
import { BarChart } from './visuals/BarChart';
import { BudgetRing } from './visuals/BudgetRing';
import { EmptyState } from './visuals/EmptyState';
import { SparklineChart } from './visuals/SparklineChart';
import { buildTokenTrendSeries } from './visuals/tokenCharts';

interface TokenMonitorProps {
  agents: Agent[];
  runs: Run[];
  metrics: PlatformMetrics | null;
  onConfigureAgent: (agentId: string) => void;
}

interface AgentTokenRow {
  agent: Agent;
  runs: Run[];
  totalTokens: number;
  avgTokens: number;
  budget: number;
  usagePct: number;
}

function formatTokens(value: number): string {
  return value.toLocaleString();
}

function tokenStatus(pct: number): { label: string; tone: 'ok' | 'warn' | 'danger' } {
  if (pct >= 100) return { label: '已达上限', tone: 'danger' };
  if (pct >= 80) return { label: '接近上限', tone: 'warn' };
  return { label: '正常', tone: 'ok' };
}

export function TokenMonitor({ agents, runs, metrics, onConfigureAgent }: TokenMonitorProps) {
  const rows: AgentTokenRow[] = agents
    .map((agent) => {
      const agentRuns = runs.filter((run) => run.agentId === agent.id);
      const totalTokens = agentRuns.reduce((sum, run) => sum + run.tokensUsed, 0);
      const withTokens = agentRuns.filter((run) => run.tokensUsed > 0);
      const avgTokens = withTokens.length > 0 ? Math.round(totalTokens / withTokens.length) : 0;
      const budget = agent.spec.limits.monthlyBudgetTokens ?? 500_000;
      const usagePct = budget > 0 ? Math.min(100, Math.round((totalTokens / budget) * 100)) : 0;
      return {
        agent,
        runs: agentRuns,
        totalTokens,
        avgTokens,
        budget,
        usagePct,
      };
    })
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const totalTokens = metrics?.totalTokens ?? runs.reduce((sum, run) => sum + run.tokensUsed, 0);
  const totalBudget = rows.reduce((sum, row) => sum + row.budget, 0);
  const totalUsagePct = totalBudget > 0 ? Math.min(100, Math.round((totalTokens / totalBudget) * 100)) : 0;
  const totalStatus = tokenStatus(totalUsagePct);
  const activeAgents = rows.filter((row) => row.totalTokens > 0).length;
  const highTokenRuns = [...runs]
    .filter((run) => run.tokensUsed > 0)
    .sort((a, b) => b.tokensUsed - a.tokensUsed)
    .slice(0, 5);
  const trend = buildTokenTrendSeries(runs);
  const distributionItems = rows
    .filter((row) => row.totalTokens > 0)
    .slice(0, 6)
    .map((row) => ({
      label: row.agent.name,
      value: row.totalTokens,
      tone: tokenStatus(row.usagePct).tone,
    }));

  return (
    <main className="main token-main">
      <div className="token-page">
        <section className="token-hero">
          <div>
            <span className="section-kicker">Token 监控</span>
            <h2>看清智能体用了多少、哪里快超预算</h2>
            <p>
              这里汇总所有任务的 token 消耗，并按智能体展示预算使用率。超过 80% 会提醒，达到上限后会阻止新任务。
            </p>
          </div>
          <div className="token-hero-meter token-hero-meter-ring">
            <BudgetRing percent={totalUsagePct} tone={totalStatus.tone} size={88} label={`总预算使用 ${totalUsagePct}%`} />
            <div>
              <span>总预算使用率</span>
              <strong>{totalUsagePct}%</strong>
              <div className="token-meter" aria-hidden>
                <div className={`token-meter-fill token-meter-${totalStatus.tone}`} style={{ width: `${totalUsagePct}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="token-stats-grid" data-tour="token-monitor">
          <article className="token-stat-card">
            <span>总消耗</span>
            <strong>{formatTokens(totalTokens)}</strong>
            <p>tokens</p>
          </article>
          <article className="token-stat-card">
            <span>平均每任务</span>
            <strong>{formatTokens(metrics?.avgTokens ?? 0)}</strong>
            <p>tokens</p>
          </article>
          <article className="token-stat-card">
            <span>估算成本</span>
            <strong>{formatMetricUsd(metrics?.totalCostUsd ?? 0)}</strong>
            <p>本地模式估算</p>
          </article>
          <article className="token-stat-card">
            <span>有消耗的智能体</span>
            <strong>{activeAgents}</strong>
            <p>共 {agents.length} 个智能体</p>
          </article>
        </section>

        <section className="token-section token-chart-section">
          <div className="token-section-head">
            <div>
              <span className="section-kicker">消耗趋势</span>
              <h3>近 7 日 Token 走势</h3>
            </div>
          </div>
          <div className="token-chart-panel">
            <SparklineChart
              points={trend.points}
              labels={trend.labels}
              emptyLabel="还没有消耗记录。运行任务后会自动生成趋势图。"
            />
          </div>
        </section>

        <section className="token-section">
          <div className="token-section-head">
            <div>
              <span className="section-kicker">按智能体</span>
              <h3>预算使用情况</h3>
            </div>
          </div>
          <div className="token-agent-layout">
            <div className="token-chart-panel token-distribution-panel">
              <h4>消耗分布</h4>
              <BarChart
                items={distributionItems}
                valueFormatter={(value) => `${formatTokens(value)} tokens`}
                emptyLabel="各智能体消耗将显示在这里。"
              />
            </div>
            <div className="token-agent-list">
              {rows.map((row) => {
                const status = tokenStatus(row.usagePct);
                return (
                  <article key={row.agent.id} className={`token-agent-card token-agent-${status.tone}`}>
                    <div className="token-agent-top">
                      <BudgetRing percent={row.usagePct} tone={status.tone} size={56} />
                      <div>
                        <strong>{row.agent.name}</strong>
                        <span>{row.runs.length} 个任务 · 平均 {formatTokens(row.avgTokens)} tokens</span>
                      </div>
                      <em>{status.label}</em>
                    </div>
                    <div className="token-agent-meter">
                      <div className="token-meter" aria-hidden>
                        <div className={`token-meter-fill token-meter-${status.tone}`} style={{ width: `${row.usagePct}%` }} />
                      </div>
                      <span>
                        {formatTokens(row.totalTokens)} / {formatTokens(row.budget)} tokens
                      </span>
                    </div>
                    <button type="button" className="arch-link-btn" onClick={() => onConfigureAgent(row.agent.id)}>
                      调整预算 →
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="token-section">
          <div className="token-section-head">
            <div>
              <span className="section-kicker">高消耗任务</span>
              <h3>最近需要关注的任务</h3>
            </div>
          </div>
          <div className="token-run-layout">
            {highTokenRuns.length === 0 ? (
              <div className="token-empty-state">
                <EmptyState variant="tokens" title="暂无 Token 消耗">
                  <p className="token-empty">还没有 token 消耗。新建任务后，这里会显示用量最高的任务。</p>
                </EmptyState>
              </div>
            ) : (
              <>
                <div className="token-chart-panel">
                  <BarChart
                    items={highTokenRuns.map((run, index) => ({
                      label: `#${index + 1}`,
                      value: run.tokensUsed,
                      tone: index === 0 ? 'warn' : 'default',
                    }))}
                    valueFormatter={(value) => `${formatTokens(value)} t`}
                  />
                </div>
                <div className="token-run-list">
                  {highTokenRuns.map((run) => {
                    const agent = agents.find((item) => item.id === run.agentId);
                    return (
                      <article key={run.id} className="token-run-card">
                        <div>
                          <strong>{friendlyTaskTitle(run)}</strong>
                          <span>{agent?.name ?? '未知智能体'} · {run.status}</span>
                        </div>
                        <b>{formatTokens(run.tokensUsed)} tokens</b>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
