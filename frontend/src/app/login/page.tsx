'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import {
  ApiError,
  login,
  register,
  forgotPassword,
  type ActiveMode,
  type CurrentUser,
} from '@/lib/auth-client';

type Mode = 'login' | 'register' | 'forgot';

const QUICK_FILL = [
  {
    label: 'Tài khoản Dịch vụ',
    email: 'advertiser@kplatform.dev',
    accent: 'hover:border-brand-gold',
  },
  {
    label: 'Tài khoản Người dùng',
    email: 'publisher@kplatform.dev',
    accent: 'hover:border-brand-blue',
  },
  { label: 'Moderator', email: 'moderator@kplatform.dev', accent: 'hover:border-purple-300' },
  { label: 'Root Admin', email: 'root@kplatform.dev', accent: 'hover:border-rose-300' },
];

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
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-10 sm:px-8">
      <div className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="space-y-1 text-center">
          <Link href="/" className="mx-auto mb-2 flex w-fit items-center">
            <Logo withWordmark={false} size={48} />
          </Link>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              {mode === 'login' && 'K-Platform Đăng Nhập'}
              {mode === 'register' && 'Đăng Ký Tài Khoản Mới'}
              {mode === 'forgot' && 'Quên Mật Khẩu'}
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            {mode === 'login' &&
              'Một tài khoản duy nhất - Sử dụng cả Tài khoản Dịch vụ và Tài khoản Người dùng.'}
            {mode === 'register' && 'Tạo tài khoản để bắt đầu tạo Campaign hoặc nhận KPoint.'}
            {mode === 'forgot' && 'Nhập email để nhận liên kết đặt lại mật khẩu.'}
          </p>
        </div>

        {mode !== 'forgot' && (
          <>
            <div className="space-y-2">
              <button
                disabled
                title="Sắp ra mắt — OAuth Google đang được phát triển"
                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 opacity-60 shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Tiếp tục với Google OAuth2</span>
              </button>
              <button
                disabled
                title="Sắp ra mắt — OAuth Facebook đang được phát triển"
                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 opacity-60 shadow-sm"
              >
                <svg className="h-4 w-4 fill-blue-600" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Tiếp tục với Facebook</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-2 text-[10px] font-bold text-slate-400 uppercase">
                Hoặc email
              </span>
            </div>
          </>
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Field label="Email">
            <div className="relative">
              <Mail className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@congty.com"
                className="pl-9"
              />
            </div>
          </Field>

          {mode !== 'forgot' && (
            <Field label="Mật khẩu" hint={mode === 'login' ? undefined : 'Tối thiểu 6 ký tự'}>
              <div className="relative">
                <Lock className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="mt-1 text-[11px] font-semibold text-brand-blue hover:underline"
                >
                  Quên mật khẩu?
                </button>
              )}
            </Field>
          )}

          {mode === 'register' && (
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-700">
                Bạn muốn tham gia với vai trò?
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveMode('A')}
                  className={`rounded-xl border p-2 text-left transition ${
                    activeMode === 'A'
                      ? 'border-brand-gold bg-brand-gold-light'
                      : 'border-slate-200 bg-white hover:border-brand-gold'
                  }`}
                >
                  <strong className="block text-slate-800">Tài khoản Dịch vụ</strong>
                  <span className="text-[10px] text-slate-500">Tôi muốn tạo chiến dịch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('B')}
                  className={`rounded-xl border p-2 text-left transition ${
                    activeMode === 'B'
                      ? 'border-brand-blue bg-brand-blue-light'
                      : 'border-slate-200 bg-white hover:border-brand-blue'
                  }`}
                >
                  <strong className="block text-slate-800">Tài khoản Người dùng</strong>
                  <span className="text-[10px] text-slate-500">
                    Tôi muốn làm review nhận thưởng
                  </span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {info}
            </p>
          )}

          <Button type="submit" variant="blue" className="w-full" disabled={submitting}>
            <KeyRound className="h-4 w-4" />
            <span>
              {submitting && 'Đang xử lý...'}
              {!submitting && mode === 'login' && 'Đăng Nhập Vào Hệ Thống'}
              {!submitting && mode === 'register' && 'Tạo Tài Khoản'}
              {!submitting && mode === 'forgot' && 'Gửi Link Đặt Lại'}
            </span>
          </Button>
        </form>

        <div className="text-center text-xs">
          {mode === 'login' && (
            <>
              <span className="text-slate-500">Chưa có tài khoản? </span>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-bold text-brand-blue hover:underline"
              >
                Đăng ký miễn phí
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              <span className="text-slate-500">Đã có tài khoản? </span>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-bold text-brand-blue hover:underline"
              >
                Đăng nhập
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Quay lại đăng nhập
            </button>
          )}
        </div>

        {mode === 'login' && (
          <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="block font-mono text-[10px] font-bold text-slate-500 uppercase">
              Tài khoản mẫu thử nghiệm (Quick Fill):
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {QUICK_FILL.map((preset) => (
                <button
                  key={preset.email}
                  type="button"
                  onClick={() => setEmail(preset.email)}
                  className={`rounded-lg border bg-white p-1.5 text-left transition ${preset.accent}`}
                >
                  <strong>{preset.label}</strong>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
