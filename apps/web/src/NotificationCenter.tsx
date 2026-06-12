import { useEffect, useRef, useState } from 'react';
import { BellIcon } from './icons';
import { EmptyState } from './visuals/EmptyState';
import type { AppNotification } from './notifications';
import { formatNotificationTime } from './notifications';

interface NotificationCenterProps {
  notifications: AppNotification[];
  readIds: Set<string>;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpen: (notification: AppNotification) => void;
}

export function NotificationCenter({
  notifications,
  readIds,
  onMarkRead,
  onMarkAllRead,
  onOpen,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleOpen(item: AppNotification) {
    onMarkRead(item.id);
    onOpen(item);
    setOpen(false);
  }

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        type="button"
        className="notification-bell"
        aria-label="通知"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ui-icon-shell ui-icon-shell-sm" aria-hidden>
          <BellIcon size="sm" />
        </span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <div>
              <strong>通知</strong>
              <span>{unreadCount > 0 ? `${unreadCount} 条未读` : '暂无未读'}</span>
            </div>
            {notifications.length > 0 && unreadCount > 0 && (
              <button type="button" className="arch-link-btn" onClick={onMarkAllRead}>
                全部已读
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <EmptyState variant="notifications" title="暂无通知">
                <p className="notification-empty">当前没有需要处理的事项。待验收或预算预警会自动出现在这里。</p>
              </EmptyState>
            ) : (
              notifications.map((item) => {
                const unread = !readIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`notification-item notification-${item.severity}${unread ? ' notification-unread' : ''}`}
                    onClick={() => handleOpen(item)}
                  >
                    <div className="notification-item-top">
                      <strong>{item.title}</strong>
                      {unread && <span className="notification-dot" aria-hidden />}
                    </div>
                    <p>{item.detail}</p>
                    <span>{formatNotificationTime(item.time)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
