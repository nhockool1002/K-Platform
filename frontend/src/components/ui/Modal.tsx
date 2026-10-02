'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} space-y-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            {eyebrow && (
              <span className="block text-[10px] font-mono font-bold text-brand-blue uppercase">
                {eyebrow}
              </span>
            )}
            <h4 className="text-base font-extrabold text-slate-900">{title}</h4>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}

        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
