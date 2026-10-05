'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, LogOut, PlusCircle, UserCircle } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { fetchCurrentUser, getAccessToken, logout, type CurrentUser } from '@/lib/auth-client';

function homeFor(user: CurrentUser): string {
  if (user.role === 'ADMIN' || user.role === 'ROOT_ADMIN' || user.role === 'MODERATOR') {
    return '/cms/overview';
  }
  return user.activeMode === 'A' ? '/a/dashboard' : '/b/dashboard';
}

// Người đã đăng nhập không bị yêu cầu đăng nhập lại khi quay về trang công khai.
export function PublicNav() {
  const router = useRouter();
  const hasToken = typeof window !== 'undefined' && getAccessToken() !== null;
  const [state, setState] = useState<{ user: CurrentUser | null; done: boolean }>({
    user: null,
    done: !hasToken,
  });

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    fetchCurrentUser()
      .then((u) => {
        if (!cancelled) setState({ user: u, done: true });
      })
      .catch(() => {
        if (!cancelled) setState({ user: null, done: true });
      });
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  function handleLogout() {
    logout();
    setState({ user: null, done: true });
    router.refresh();
  }

  const { user, done } = state;

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
          {!done ? null : user ? (
            <>
              <Link
                href={homeFor(user)}
                className="flex items-center gap-1.5 rounded-xl bg-brand-gold px-3 py-1.5 font-bold text-slate-950 shadow-sm transition hover:bg-brand-gold-hover"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Về trang của tôi</span>
                <span className="sm:hidden">Trang của tôi</span>
              </Link>
              <Link
                href="/profile"
                className="hidden items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 md:flex"
              >
                <UserCircle className="h-4 w-4" />
                Hồ sơ
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
