import { type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'gold' | 'blue' | 'outline' | 'dark' | 'danger' | 'danger-ghost' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  gold: 'bg-brand-gold hover:bg-brand-gold-hover text-slate-950 shadow-sm',
  blue: 'bg-brand-blue hover:bg-brand-blue-dark text-white shadow-sm',
  dark: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm',
  outline: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  'danger-ghost': 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-xs sm:text-sm',
};

export function Button({ variant = 'blue', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
