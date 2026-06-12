import type { AiTab } from '../assistant/types';
import { ModuleIcon } from '../icons';

const LOOP_STEPS: Array<{
  id: AiTab | 'agents';
  label: string;
  desc: string;
  icon: 'ai' | 'agents';
  tab?: AiTab;
}> = [
  { id: 'data', label: '数据工场', desc: '采集 · 清洗', icon: 'ai', tab: 'data' },
  { id: 'training', label: '训练中心', desc: '微调 · 评估', icon: 'ai', tab: 'training' },
  { id: 'models', label: '模型广场', desc: '发布 · 选用', icon: 'ai', tab: 'models' },
  { id: 'agents', label: '智能体', desc: '挂载 · 调用', icon: 'agents' },
];

interface AiLoopDiagramProps {
  activeTab: AiTab;
  onSelectTab?: (tab: AiTab) => void;
}

export function AiLoopDiagram({ activeTab, onSelectTab }: AiLoopDiagramProps) {
  return (
    <div className="ai-loop-diagram" aria-label="AI 平台闭环">
      {LOOP_STEPS.map((step, index) => {
        const isActive = step.tab === activeTab;
        const isNext = step.id === 'agents' && activeTab === 'models';

        const content = (
          <>
            <span className="module-icon-shell module-icon-shell-sm">
              <ModuleIcon id={step.icon} size="sm" />
            </span>
            <strong>{step.label}</strong>
            <span>{step.desc}</span>
          </>
        );

        return (
          <div key={step.id} className="ai-loop-wrap">
            {step.tab ? (
              <button
                type="button"
                className={`ai-loop-node${isActive ? ' is-active' : ''}`}
                onClick={() => onSelectTab?.(step.tab!)}
              >
                {content}
              </button>
            ) : (
              <div className={`ai-loop-node${isNext ? ' is-next' : ''}`}>{content}</div>
            )}
            {index < LOOP_STEPS.length - 1 && <span className="ai-loop-arrow" aria-hidden>→</span>}
          </div>
        );
      })}
    </div>
  );
}
