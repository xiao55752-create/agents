import type { ReactNode } from 'react';
import type { ModuleIconId } from './modules';

type IconSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 28,
};

interface IconProps {
  size?: IconSize;
  className?: string;
  label?: string;
}

function SvgShell({
  size = 'md',
  className = '',
  label,
  children,
}: IconProps & { children: ReactNode }) {
  const px = SIZE_MAP[size];
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
    >
      {children}
    </svg>
  );
}

const MODULE_PATHS: Record<ModuleIconId, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  tasks: (
    <>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </>
  ),
  agents: (
    <>
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  ai: (
    <>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="m8.5 8.5 7 7" />
      <path d="m15.5 8.5-7 7" />
    </>
  ),
  tokens: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15V11" />
      <path d="M12 15V8" />
      <path d="M16 15v-5" />
    </>
  ),
  architecture: (
    <>
      <path d="M4 18h16" />
      <path d="M6 14h12" />
      <path d="M8 10h8" />
      <path d="M10 6h4" />
    </>
  ),
};

export function ModuleIcon({
  id,
  size = 'md',
  className = '',
  label,
}: IconProps & { id: ModuleIconId }) {
  return (
    <SvgShell size={size} className={`module-icon module-icon-${id} ${className}`.trim()} label={label}>
      {MODULE_PATHS[id]}
    </SvgShell>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <SvgShell {...props} className={`ui-icon-bell ${props.className ?? ''}`.trim()}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </SvgShell>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <SvgShell {...props} className={`ui-icon-chat ${props.className ?? ''}`.trim()}>
      <path d="M7 9h10" />
      <path d="M7 13h6" />
      <path d="M21 12c0 4.4-4 8-9 8-1 0-2-.1-3-.3L3 21l1.7-4.2C3.6 15.4 3 13.8 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
    </SvgShell>
  );
}
