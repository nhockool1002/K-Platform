import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div>
        {eyebrow && <p className="text-navy mb-1 text-sm font-medium">{eyebrow}</p>}
        <h1 className="font-display text-ink text-2xl font-medium">{title}</h1>
        {description && <p className="text-ink-muted mt-1 max-w-2xl text-sm">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
