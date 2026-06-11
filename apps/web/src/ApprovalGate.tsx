import { useState } from 'react';

interface ApprovalGateProps {
  onApprove: () => void | Promise<void>;
  onReject: (reason?: string) => void | Promise<void>;
  onRevise: (notes: string) => void | Promise<void>;
  compact?: boolean;
}

export function ApprovalGate({ onApprove, onReject, onRevise, compact = false }: ApprovalGateProps) {
  const [showReject, setShowReject] = useState(false);
  const [showRevise, setShowRevise] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [reviseNotes, setReviseNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: () => void | Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`approval-gate${compact ? ' approval-gate-compact' : ''}`}>
      <div className="approval-gate-head">
        <span className="approval-gate-badge">Human Gate</span>
        <h3>Draft PR 待验收</h3>
        <p>通过即完成；要求修改会带着你的说明重跑；打回重做将自动重新排队执行。</p>
      </div>

      {!showReject && !showRevise && (
        <div className="approval-gate-actions">
          <button type="button" className="btn btn-success" disabled={busy} onClick={() => void run(onApprove)}>
            ✓ 通过
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setShowRevise(true)}>
            ✎ 要求修改
          </button>
          <button type="button" className="btn btn-ghost btn-danger-text" disabled={busy} onClick={() => setShowReject(true)}>
            ✕ 打回重做
          </button>
        </div>
      )}

      {showReject && (
        <div className="approval-gate-form">
          <label>
            打回原因（可选）
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="例如：改动范围过大，未覆盖边界情况"
            />
          </label>
          <div className="approval-gate-form-actions">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setShowReject(false)}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-danger-text"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await onReject(rejectReason.trim() || undefined);
                  setShowReject(false);
                  setRejectReason('');
                })
              }
            >
              确认打回并重新执行
            </button>
          </div>
        </div>
      )}

      {showRevise && (
        <div className="approval-gate-form">
          <label>
            修改要求
            <textarea
              value={reviseNotes}
              onChange={(e) => setReviseNotes(e.target.value)}
              rows={4}
              placeholder="例如：请补充登录失败时的错误提示，并增加单元测试"
              required
            />
          </label>
          <div className="approval-gate-form-actions">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setShowRevise(false)}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !reviseNotes.trim()}
              onClick={() =>
                void run(async () => {
                  await onRevise(reviseNotes.trim());
                  setShowRevise(false);
                  setReviseNotes('');
                })
              }
            >
              发送修改要求并重新执行
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
