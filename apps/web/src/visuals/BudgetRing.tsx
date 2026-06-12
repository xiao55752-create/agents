type RingTone = 'ok' | 'warn' | 'danger';

const TONE_COLOR: Record<RingTone, string> = {
  ok: 'var(--accent)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
};

interface BudgetRingProps {
  percent: number;
  tone?: RingTone;
  size?: number;
  label?: string;
}

export function BudgetRing({ percent, tone = 'ok', size = 72, label }: BudgetRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="budget-ring" style={{ width: size, height: size }} role="img" aria-label={label ?? `预算使用 ${clamped}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TONE_COLOR[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="budget-ring-label">{clamped}%</span>
    </div>
  );
}
