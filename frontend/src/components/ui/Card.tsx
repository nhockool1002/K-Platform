import type { HTMLAttributes, ReactNode } from 'react';

const ROUNDED_CLASSES = {
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
} as const;

export function Card({
  children,
  className = '',
  rounded = '2xl',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  rounded?: '2xl' | '3xl';
}) {
  return (
    <div
      className={`${ROUNDED_CLASSES[rounded]} border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  valueClassName = 'text-slate-900',
  hint,
  hintClassName = 'text-slate-500',
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  hint?: ReactNode;
  hintClassName?: string;
}) {
  return (
    <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="block text-[10px] font-bold tracking-wide text-slate-400 uppercase">
        {label}
      </span>
      <div className={`font-mono text-xl font-extrabold sm:text-2xl ${valueClassName}`}>
        {value}
      </div>
      {hint && <div className={`text-[11px] ${hintClassName}`}>{hint}</div>}
    </div>
  );
}
