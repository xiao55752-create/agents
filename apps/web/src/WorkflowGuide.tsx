import { useState } from 'react';
import { AGENT_WORKFLOW, USER_WORKFLOW, WORKFLOW_SUMMARY } from './workflow';

interface WorkflowGuideProps {
  compact?: boolean;
}

function ActorTag({ label, actor }: { label: string; actor: 'user' | 'system' | 'both' }) {
  return <span className={`workflow-actor workflow-actor-${actor}`}>{label}</span>;
}

export function WorkflowGuide({ compact = false }: WorkflowGuideProps) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div className="workflow-compact">
        <p className="workflow-summary">{WORKFLOW_SUMMARY}</p>
        <ol className="workflow-compact-list">
          {USER_WORKFLOW.filter((s) => !s.optional).map((step) => (
            <li key={step.order}>
              <strong>{step.title}</strong>
              <span>{step.description}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <section className="workflow-guide">
      <div className="workflow-intro">
        <h2>完成一次智能体工作，需要走哪些步骤？</h2>
        <p className="workflow-summary">{WORKFLOW_SUMMARY}</p>
        <p className="workflow-note">
          你负责<strong>意图（10%）</strong>与<strong>Gate 验收（10%）</strong>，中间 80% 由 AI 自动完成。
          验收顺序：Issue → 执行摘要 → Draft PR → 通过 / 修改 / 打回。
        </p>
        <button type="button" className="btn btn-ghost workflow-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '收起完整流程 ↑' : '展开完整流程（5+7 步）↓'}
        </button>
      </div>

      {expanded && (
        <div className="workflow-columns">
          <div className="workflow-column">
            <h3>你要做的事</h3>
            <p className="workflow-column-desc">用户负责：写 Issue、验收 Draft PR、Gate 决策</p>
            <ol className="workflow-steps">
              {USER_WORKFLOW.map((step) => (
                <li key={step.order} className={step.optional ? 'workflow-step optional' : 'workflow-step'}>
                  <div className="workflow-step-head">
                    <span className="workflow-num">{step.order}</span>
                    <ActorTag label={step.actorLabel} actor={step.actor} />
                    {step.optional && <span className="workflow-optional">可选</span>}
                  </div>
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                  <p className="workflow-detail">{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="workflow-column">
            <h3>AI 自动做的事</h3>
            <p className="workflow-column-desc">智能体负责：读 Issue、改码、测试、开 Draft PR</p>
            <ol className="workflow-steps">
              {AGENT_WORKFLOW.map((step) => (
                <li key={step.order} className="workflow-step">
                  <div className="workflow-step-head">
                    <span className="workflow-num">{step.order}</span>
                    <ActorTag label={step.actorLabel} actor={step.actor} />
                  </div>
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                  <p className="workflow-detail">{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
