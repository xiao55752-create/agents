import { USER_WORKFLOW } from './workflow';

const FLOW_STEPS = USER_WORKFLOW.filter((step) => !step.optional).slice(0, 5);

export function WorkflowFlowBar() {
  return (
    <div className="workflow-flow-bar" aria-label="协作流程概览">
      {FLOW_STEPS.map((step, index) => (
        <div
          key={step.order}
          className={`workflow-flow-step workflow-flow-actor-${step.actor}${index === FLOW_STEPS.length - 1 ? ' workflow-flow-step-last' : ''}`}
        >
          <div className="workflow-flow-node">
            <span className="workflow-flow-num">{step.order}</span>
          </div>
          <strong>{step.title}</strong>
          <span className={`workflow-flow-tag workflow-flow-tag-${step.actor}`}>{step.actorLabel}</span>
          {index < FLOW_STEPS.length - 1 && <span className="workflow-flow-arrow" aria-hidden>→</span>}
        </div>
      ))}
    </div>
  );
}
