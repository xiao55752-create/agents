import type { IterationInsight } from './iterationInsights';

interface AgentIterationTipsProps {
  insights: IterationInsight[];
  loading?: boolean;
}

export function AgentIterationTips({ insights, loading }: AgentIterationTipsProps) {
  if (loading) {
    return <p className="iteration-loading">正在分析审计数据…</p>;
  }

  return (
    <ul className="iteration-tips">
      {insights.map((tip) => (
        <li key={tip.id} className={`iteration-tip iteration-tip-${tip.severity}`}>
          <strong>{tip.title}</strong>
          <span>{tip.detail}</span>
        </li>
      ))}
    </ul>
  );
}
