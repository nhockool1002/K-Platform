import type { ReactNode } from 'react';

export type BadgeTone =
  'neutral' | 'positive' | 'warning' | 'critical' | 'info' | 'purple' | 'gold';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  positive: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  info: 'bg-blue-100 text-brand-blue border-blue-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  gold: 'bg-brand-gold text-slate-950 border-transparent',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
