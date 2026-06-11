import type { GateCheckSnapshot } from './gateChecks';
import { gateCheckSummary } from './gateChecks';

interface GatePrecheckProps {
  checks: GateCheckSnapshot;
  variant?: 'passed' | 'failed' | 'pending';
}

export function GatePrecheck({ checks, variant = 'passed' }: GatePrecheckProps) {
  const allOk = checks.passed;

  return (
    <section
      className={`gate-precheck gate-precheck-${variant}${allOk ? ' gate-precheck-ok' : ' gate-precheck-blocked'}`}
    >
      <div className="gate-precheck-head">
        <span className="gate-precheck-kicker">Gate 前检查</span>
        <h3>{allOk ? '全部通过，可进入验收' : '未通过，已阻断进入 Gate'}</h3>
        <p className="gate-precheck-summary">{gateCheckSummary(checks)}</p>
      </div>
      <ul className="gate-precheck-list">
        {checks.items.map((item) => (
          <li key={item.id} className={item.ok ? 'gate-precheck-item ok' : 'gate-precheck-item fail'}>
            <span className="gate-precheck-icon" aria-hidden>
              {item.ok ? '✓' : '✕'}
            </span>
            <div>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </div>
          </li>
        ))}
      </ul>
      {variant === 'failed' && !allOk && (
        <p className="gate-precheck-hint">
          可在 Issue 中去掉「测试失败」标记后重试，或在智能体页挂载测试 Skill。
        </p>
      )}
    </section>
  );
}
