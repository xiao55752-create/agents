import { useRef, type KeyboardEvent } from 'react';
import { ModuleIcon } from '../icons';
import { getSkill } from '../skills/catalog';

interface AgentSkillTopologyProps {
  agentName: string;
  model: string;
  skillRefs: string[];
  toolCount: number;
  activeSkillRef?: string | null;
  onSkillSelect?: (ref: string) => void;
  onSkillToggle?: (ref: string) => void;
}

function shortSkillName(ref: string): string {
  const skill = getSkill(ref);
  if (skill?.name) return skill.name;
  return ref.split('@')[0] ?? ref;
}

export function AgentSkillTopology({
  agentName,
  model,
  skillRefs,
  toolCount,
  activeSkillRef = null,
  onSkillSelect,
  onSkillToggle,
}: AgentSkillTopologyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const skills = skillRefs.map((ref) => ({ ref, name: shortSkillName(ref) }));

  function selectByIndex(index: number) {
    const skill = skills[index];
    if (skill && onSkillSelect) onSkillSelect(skill.ref);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (skills.length === 0) return;

    if ((event.key === 'Enter' || event.key === ' ') && activeSkillRef && onSkillToggle) {
      event.preventDefault();
      onSkillToggle(activeSkillRef);
      return;
    }

    if (!onSkillSelect) return;

    const navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!navigationKeys.includes(event.key)) return;

    event.preventDefault();
    const currentIndex = activeSkillRef ? skills.findIndex((skill) => skill.ref === activeSkillRef) : -1;

    if (event.key === 'Home') {
      selectByIndex(0);
      return;
    }
    if (event.key === 'End') {
      selectByIndex(skills.length - 1);
      return;
    }

    const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + step + skills.length) % skills.length;
    selectByIndex(nextIndex);
  }

  if (skills.length === 0) {
    return (
      <div className="agent-topology agent-topology-empty">
        <ModuleIcon id="agents" size="md" />
        <p>勾选能力包后，这里会显示智能体与能力的挂载关系图。点击节点或下方卡片可双向定位。</p>
      </div>
    );
  }

  const width = 420;
  const height = 260;
  const cx = width / 2;
  const cy = 96;
  const radius = 118;
  const nodes = skills.map((skill, index) => {
    const angle = (2 * Math.PI * index) / skills.length - Math.PI / 2;
    return {
      ...skill,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  return (
    <div
      ref={containerRef}
      className="agent-topology"
      aria-label="智能体能力包拓扑"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="agent-topology-svg" role="img" aria-hidden>
        {nodes.map((node) => (
          <line
            key={`line-${node.ref}`}
            x1={cx}
            y1={cy}
            x2={node.x}
            y2={node.y}
            className={`agent-topology-line${activeSkillRef === node.ref ? ' is-active' : ''}`}
          />
        ))}
        <circle cx={cx} cy={cy} r="34" className="agent-topology-core" />
        {nodes.map((node) => (
          <g key={node.ref} transform={`translate(${node.x} ${node.y})`}>
            <circle
              r="24"
              className={`agent-topology-node${activeSkillRef === node.ref ? ' is-active' : ''}${onSkillSelect ? ' is-clickable' : ''}`}
              onClick={() => onSkillSelect?.(node.ref)}
            />
            <title>{node.name}</title>
          </g>
        ))}
      </svg>

      <div className="agent-topology-labels">
        <div className="agent-topology-center-label">
          <strong>{agentName}</strong>
          <span>{model}</span>
        </div>
        <div className="agent-topology-skill-labels">
          {nodes.map((node) => (
            <button
              key={node.ref}
              type="button"
              className={`agent-topology-skill-chip${activeSkillRef === node.ref ? ' is-active' : ''}`}
              title={node.ref}
              onClick={() => onSkillSelect?.(node.ref)}
            >
              {node.name}
            </button>
          ))}
        </div>
      </div>

      <p className="agent-topology-meta">
        挂载 {skills.length} 个能力包 · 映射 {toolCount} 个工具 · ← → 切换 · Enter 勾选/取消
      </p>
    </div>
  );
}
