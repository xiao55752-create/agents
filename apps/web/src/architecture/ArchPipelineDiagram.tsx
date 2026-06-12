import type { ArchLayer, LayerStatus } from './model';

const STATUS_LABEL: Record<LayerStatus, string> = {
  demo: '本地已覆盖',
  planned: '规划中',
  future: '远期',
};

interface ArchPipelineDiagramProps {
  layers: ArchLayer[];
  onNavigate?: (page: NonNullable<ArchLayer['demoPage']>) => void;
}

export function ArchPipelineDiagram({ layers, onNavigate }: ArchPipelineDiagramProps) {
  const ordered = [...layers].sort((a, b) => b.order - a.order);

  return (
    <div className="arch-pipeline" aria-label="六层架构横向概览">
      {ordered.map((layer, index) => (
        <div key={layer.id} className="arch-pipeline-wrap">
          <article
            className={`arch-layer arch-layer-compact${layer.status === 'demo' ? ' highlight' : ''}`}
          >
            <div className="arch-layer-head">
              <strong>{layer.title}</strong>
              <span>{layer.subtitle.split('—')[0]?.trim() ?? layer.subtitle}</span>
            </div>
            <span className={`arch-status-badge status-${layer.status}`}>{STATUS_LABEL[layer.status]}</span>
            {layer.demoPage && onNavigate && (
              <button type="button" className="arch-link-btn arch-layer-link" onClick={() => onNavigate(layer.demoPage!)}>
                去体验 →
              </button>
            )}
          </article>
          {index < ordered.length - 1 && <span className="arch-arrow" aria-hidden>→</span>}
        </div>
      ))}
    </div>
  );
}
