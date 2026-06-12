import { useEffect, useRef, useState } from 'react';
import { ChatIcon } from './icons';
import { buildWelcomeReply, actionLabel, QUICK_PROMPTS, replyToUser } from './assistant/replies';
import { NAV_MODULES } from './modules';
import type { AssistantAction, AssistantContext, ChatMessage } from './assistant/types';

interface AssistantPanelProps {
  context: AssistantContext;
  onAction: (action: AssistantAction) => void;
}

function msgId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function AssistantPanel({ context, onAction }: AssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  const contextKey = `${context.page}:${context.pendingApprovalCount}:${context.selectedRun?.id ?? ''}:${context.budgetWarningCount}`;

  useEffect(() => {
    seededRef.current = false;
  }, [contextKey]);

  useEffect(() => {
    if (!open || seededRef.current) return;
    const welcome = buildWelcomeReply(context);
    setMessages([
      {
        id: msgId(),
        role: 'assistant',
        text: welcome.text,
        actions: welcome.actions,
      },
    ]);
    seededRef.current = true;
  }, [open, context]);

  const pageLabel = NAV_MODULES.find((item) => item.page === context.page)?.label ?? context.page;

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  function appendAssistant(text: string, actions?: AssistantAction[]) {
    setMessages((prev) => [...prev, { id: msgId(), role: 'assistant', text, actions }]);
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: msgId(), role: 'user', text: trimmed }]);
    setInput('');
    const reply = replyToUser(trimmed, context);
    appendAssistant(reply.text, reply.actions);
  }

  function handleAction(action: AssistantAction) {
    onAction(action);
    appendAssistant(`好的，已为你打开：${actionLabel(action)}。`);
  }

  return (
    <>
      {!open && (
        <button type="button" className="assistant-fab" onClick={() => setOpen(true)} aria-label="打开协同助手">
          <span className="ui-icon-shell ui-icon-shell-sm ui-icon-shell-accent" aria-hidden>
            <ChatIcon size="sm" />
          </span>
          <strong>协同助手</strong>
        </button>
      )}

      {open && (
        <section className="assistant-panel" aria-label="协同助手">
          <header className="assistant-panel-head">
            <div>
              <strong>协同助手</strong>
              <span>用对话带你操作，降低使用门槛</span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              收起
            </button>
          </header>

          <div className="assistant-context-bar">
            <span>当前：{pageLabel}</span>
            {context.pendingApprovalCount > 0 && <em>{context.pendingApprovalCount} 待验收</em>}
            {context.budgetWarningCount > 0 && <em>{context.budgetWarningCount} 预算预警</em>}
            {context.selectedRun && <span>· {context.selectedRun.title}</span>}
          </div>

          <div className="assistant-messages" ref={listRef}>
            {messages.map((message) => (
              <div key={message.id} className={`assistant-message assistant-message-${message.role}`}>
                <p>{message.text}</p>
                {message.role === 'assistant' && message.actions && message.actions.length > 0 && (
                  <div className="assistant-actions">
                    {message.actions.map((action, index) => (
                      <button
                        key={`${message.id}-${index}`}
                        type="button"
                        className="assistant-action-btn"
                        onClick={() => handleAction(action)}
                      >
                        {actionLabel(action)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="assistant-quick">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" className="assistant-quick-btn" onClick={() => send(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <form
            className="assistant-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：帮我新建第一个任务"
            />
            <button type="submit" className="btn btn-primary btn-sm">
              发送
            </button>
          </form>
        </section>
      )}
    </>
  );
}
