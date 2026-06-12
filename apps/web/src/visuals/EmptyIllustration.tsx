export type EmptyIllustrationVariant =
  | 'tasks'
  | 'tokens'
  | 'ai-data'
  | 'ai-training'
  | 'search'
  | 'notifications';

interface EmptyIllustrationProps {
  variant: EmptyIllustrationVariant;
  title?: string;
}

export function EmptyIllustration({ variant, title }: EmptyIllustrationProps) {
  return (
    <div className={`empty-illustration empty-illustration-${variant}`} aria-hidden={title ? undefined : true} role={title ? 'img' : 'presentation'} aria-label={title}>
      <svg viewBox="0 0 120 96" className="empty-illustration-svg">
        {variant === 'tasks' && (
          <>
            <rect x="28" y="14" width="64" height="72" rx="8" fill="rgba(var(--accent-rgb), 0.08)" stroke="rgba(var(--accent-rgb), 0.35)" strokeWidth="2" />
            <path d="M40 30h40M40 42h32M40 54h36" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="84" cy="72" r="14" fill="rgba(var(--accent-rgb), 0.15)" stroke="var(--accent)" strokeWidth="2" />
            <path d="M78 72l4 4 8-8" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {variant === 'tokens' && (
          <>
            <rect x="18" y="58" width="14" height="24" rx="3" fill="rgba(96,165,250,0.2)" stroke="#60a5fa" strokeWidth="1.5" />
            <rect x="38" y="44" width="14" height="38" rx="3" fill="rgba(var(--accent-rgb),0.2)" stroke="var(--accent)" strokeWidth="1.5" />
            <rect x="58" y="32" width="14" height="50" rx="3" fill="rgba(var(--purple-rgb),0.18)" stroke="var(--purple)" strokeWidth="1.5" />
            <rect x="78" y="48" width="14" height="34" rx="3" fill="rgba(251,191,36,0.15)" stroke="var(--warn)" strokeWidth="1.5" />
            <path d="M16 82h88" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {variant === 'ai-data' && (
          <>
            <ellipse cx="60" cy="28" rx="28" ry="10" fill="rgba(var(--accent-rgb),0.12)" stroke="var(--accent)" strokeWidth="2" />
            <path d="M32 28v34c0 5.5 12.5 10 28 10s28-4.5 28-10V28" fill="rgba(var(--accent-rgb),0.06)" stroke="var(--accent)" strokeWidth="2" />
            <ellipse cx="60" cy="62" rx="28" ry="10" fill="rgba(var(--purple-rgb),0.1)" stroke="var(--purple)" strokeWidth="2" />
            <path d="M32 62v12c0 5.5 12.5 10 28 10s28-4.5 28-10V62" fill="rgba(var(--purple-rgb),0.05)" stroke="var(--purple)" strokeWidth="2" />
          </>
        )}
        {variant === 'ai-training' && (
          <>
            <circle cx="30" cy="48" r="10" fill="rgba(var(--accent-rgb),0.15)" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="60" cy="28" r="10" fill="rgba(var(--purple-rgb),0.15)" stroke="var(--purple)" strokeWidth="2" />
            <circle cx="90" cy="48" r="10" fill="rgba(96,165,250,0.15)" stroke="#60a5fa" strokeWidth="2" />
            <circle cx="60" cy="68" r="10" fill="rgba(var(--accent-rgb),0.12)" stroke="var(--accent)" strokeWidth="2" />
            <path d="M38 44L52 32M68 32l12 12M52 68l8-12M72 44l12-2" stroke="var(--text-tertiary)" strokeWidth="1.5" />
          </>
        )}
        {variant === 'search' && (
          <>
            <circle cx="52" cy="42" r="18" fill="rgba(var(--accent-rgb),0.08)" stroke="var(--accent)" strokeWidth="2" />
            <path d="M66 56l18 18" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
            <path d="M44 42h16M52 34v16" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {variant === 'notifications' && (
          <>
            <path d="M38 34a22 22 0 0 1 44 0c0 12-6 12-6 12H44s-6 0-6-12z" fill="rgba(var(--accent-rgb),0.1)" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M48 58a6 6 0 0 0 12 0" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="78" cy="30" r="10" fill="rgba(34,197,94,0.15)" stroke="#4ade80" strokeWidth="2" />
            <path d="M74 30l3 3 6-6" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
}
