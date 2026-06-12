import type { ReactNode } from 'react';
import { EmptyIllustration, type EmptyIllustrationVariant } from './EmptyIllustration';

interface EmptyStateProps {
  variant: EmptyIllustrationVariant;
  title?: string;
  children: ReactNode;
}

export function EmptyState({ variant, title, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <EmptyIllustration variant={variant} title={title} />
      <div className="empty-state-copy">{children}</div>
    </div>
  );
}
