import { friendlyAuditLabel, friendlyAuditPayload } from './friendly';

export interface AuditEvent {
  id: number;
  type: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

interface AuditTimelineProps {
  events: AuditEvent[];
  compact?: boolean;
}

export function AuditTimeline({ events, compact = false }: AuditTimelineProps) {
  if (events.length === 0) {
    return <p className="audit-empty">{compact ? '暂无审计记录' : '审计事件将在任务创建后自动生成'}</p>;
  }

  return (
    <ol className={`audit-timeline${compact ? ' audit-timeline-compact' : ''}`}>
      {events.map((event) => (
        <li key={event.id} className="audit-event">
          <span className="audit-event-time">
            {new Date(event.createdAt).toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
          <strong>{friendlyAuditLabel(event.type)}</strong>
          {(() => {
            const detail = friendlyAuditPayload(event);
            if (detail) return <span className="audit-event-detail">{detail}</span>;
            if (event.payload && Object.keys(event.payload).length > 0) {
              return <code className="audit-event-payload">{JSON.stringify(event.payload)}</code>;
            }
            return null;
          })()}
        </li>
      ))}
    </ol>
  );
}
