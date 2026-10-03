import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export function PublicNav() {
  return (
    <nav className="border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Logo size={28} withWordmark={false} />
          <span className="hidden text-base font-extrabold tracking-tight text-slate-900 sm:inline">
            K<span className="text-brand-gold">-PLATFORM</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold sm:gap-4">
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-xl bg-brand-gold px-3 py-1.5 font-bold text-slate-950 shadow-sm transition hover:bg-brand-gold-hover"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Tạo Campaign (Tài khoản Dịch vụ)</span>
            <span className="sm:hidden">Tạo Camp</span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-100"
          >
            Đăng nhập / Đăng ký
          </Link>
        </div>
      </div>
    </nav>
  );
}
