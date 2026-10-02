import type { ReactNode } from 'react';

type Tone = 'neutral' | 'positive' | 'warning' | 'critical' | 'gold';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-paper text-ink-muted border-line',
  positive: 'bg-ledger-green-bg text-ledger-green border-transparent',
  warning: 'bg-gold/15 text-gold-dark border-transparent',
  critical: 'bg-ledger-red-bg text-ledger-red border-transparent',
  gold: 'bg-gold text-ink border-transparent',
};

export function StatusPill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
