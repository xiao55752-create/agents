interface WorkbenchFlowGuideProps {
  hasRuns: boolean;
  pendingApprovalCount: number;
}

const STEPS = [
  { num: '1', title: '选任务', desc: '左侧列表点选', tone: 'list' as const },
  { num: '2', title: '看方案', desc: '摘要 · 差异 · 日志', tone: 'detail' as const },
  { num: '3', title: '点通过', desc: '人工验收 Gate', tone: 'gate' as const },
];

export function WorkbenchFlowGuide({ hasRuns, pendingApprovalCount }: WorkbenchFlowGuideProps) {
  const highlightGate = pendingApprovalCount > 0;

  return (
    <div className="workbench-flow-guide" aria-label="工作台操作流程">
      <div className="workbench-flow-steps">
        {STEPS.map((step, index) => (
          <div
            key={step.num}
            className={`workbench-flow-step workbench-flow-${step.tone}${
              step.tone === 'list' && hasRuns ? ' is-ready' : ''
            }${step.tone === 'gate' && highlightGate ? ' is-highlight' : ''}`}
          >
            <span className="workbench-flow-num">{step.num}</span>
            <strong>{step.title}</strong>
            <span className="workbench-flow-desc">{step.desc}</span>
            {index < STEPS.length - 1 && <span className="workbench-flow-arrow" aria-hidden>→</span>}
          </div>
        ))}
      </div>
      {highlightGate && (
        <p className="workbench-flow-hint">
          有 <strong>{pendingApprovalCount}</strong> 个待验收任务：选中橙色标记项，在右侧验收区点击「通过」。
        </p>
      )}
      {!hasRuns && (
        <p className="workbench-flow-hint">还没有任务时，可先点「新建任务」触发第一条演示链路。</p>
      )}
    </div>
  );
}
