'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import {
  ApiError,
  login,
  register,
  forgotPassword,
  type ActiveMode,
  type CurrentUser,
} from '@/lib/auth-client';

type Mode = 'login' | 'register' | 'forgot';

function redirectForUser(user: CurrentUser): string {
  if (user.role === 'ADMIN' || user.role === 'ROOT_ADMIN' || user.role === 'MODERATOR') {
    return '/cms/overview';
  }
  return user.activeMode === 'A' ? '/a/dashboard' : '/b/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeMode, setActiveMode] = useState<ActiveMode>('A');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const user = await login(email, password);
        router.push(redirectForUser(user));
        return;
      }

      if (mode === 'register') {
        const user = await register(email, password, activeMode);
        router.push(redirectForUser(user));
        return;
      }

      // mode === 'forgot'
      const res = await forgotPassword(email);
      setInfo(
        res.devResetToken
          ? `${res.message} (Dev: mở /reset-password?token=${res.devResetToken})`
          : res.message,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-[480px] lg:shrink-0">
        <Link href="/" className="mb-10">
          <Logo size={28} />
        </Link>

        <h1 className="font-display text-ink text-2xl font-medium">
          {mode === 'login' && 'Đăng nhập'}
          {mode === 'register' && 'Đăng ký tài khoản'}
          {mode === 'forgot' && 'Quên mật khẩu'}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          {mode === 'login' && (
            <>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-navy font-medium"
              >
                Đăng ký miễn phí
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-navy font-medium"
              >
                Đăng nhập
              </button>
            </>
          )}
          {mode === 'forgot' && 'Nhập email để nhận link đặt lại mật khẩu.'}
        </p>

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@congty.com"
              className="border-line text-ink placeholder:text-ink-muted border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-navy"
            />
          </label>

          {mode !== 'forgot' && (
            <label className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink font-medium">Mật khẩu</span>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-navy text-xs"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-line text-ink border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-navy"
              />
            </label>
          )}

          {mode === 'register' && (
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink font-medium">Bạn muốn tham gia với vai trò?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMode('A')}
                  className={`flex-1 border px-3 py-2 text-xs font-medium ${
                    activeMode === 'A'
                      ? 'border-navy bg-navy text-white'
                      : 'border-line text-ink-muted'
                  }`}
                >
                  Bên A — Advertiser
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('B')}
                  className={`flex-1 border px-3 py-2 text-xs font-medium ${
                    activeMode === 'B'
                      ? 'border-navy bg-navy text-white'
                      : 'border-line text-ink-muted'
                  }`}
                >
                  Bên B — Publisher
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="bg-ledger-red-bg text-ledger-red border border-current/20 px-3 py-2 text-xs">
              {error}
            </p>
          )}
          {info && (
            <p className="bg-ledger-green-bg text-ledger-green border border-current/20 px-3 py-2 text-xs">
              {info}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={submitting}>
            {submitting && 'Đang xử lý...'}
            {!submitting && mode === 'login' && 'Đăng nhập'}
            {!submitting && mode === 'register' && 'Tạo tài khoản'}
            {!submitting && mode === 'forgot' && 'Gửi link đặt lại'}
          </Button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-ink-muted text-center text-xs"
            >
              ← Quay lại đăng nhập
            </button>
          )}
        </form>

        {mode !== 'forgot' && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs">
              <span className="border-line h-px flex-1 border-t" />
              <span className="text-ink-muted">hoặc tiếp tục với</span>
              <span className="border-line h-px flex-1 border-t" />
            </div>

            <div className="flex flex-col gap-2">
              <button
                disabled
                title="Sắp ra mắt — OAuth Google đang được phát triển"
                className="border-line text-ink-muted flex cursor-not-allowed items-center justify-between border px-4 py-2 text-sm font-medium opacity-60"
              >
                <span>Google</span>
                <span className="text-[10px] tracking-wide uppercase">Sắp ra mắt</span>
              </button>
              <button
                disabled
                title="Sắp ra mắt — OAuth Facebook đang được phát triển"
                className="border-line text-ink-muted flex cursor-not-allowed items-center justify-between border px-4 py-2 text-sm font-medium opacity-60"
              >
                <span>Facebook</span>
                <span className="text-[10px] tracking-wide uppercase">Sắp ra mắt</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mảng bên phải: gắn login với bằng chứng đã xác thực thật — không phải minh họa trang trí */}
      <div className="bg-navy-dark relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
        <div className="relative w-72 -rotate-2 border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
          <div className="aspect-[4/3] w-full bg-white/10" />
          <div className="absolute top-3 right-3 border border-white/40 px-2 py-0.5 text-[10px] tracking-wide text-white/90">
            UID-7F21 · CP-101
          </div>
          <p className="mt-3 text-sm text-white/90">Review quán cà phê Lữ — chi nhánh Q.1</p>
          <p className="font-ledger mt-1 text-xs text-white/60">
            Proof đã được đóng dấu định danh người gửi &amp; chiến dịch
          </p>
        </div>
      </div>
    </div>
  );
}
