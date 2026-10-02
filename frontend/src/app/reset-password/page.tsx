'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { ApiError, resetPassword } from '@/lib/auth-client';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
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
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Đặt Lại Mật Khẩu</h1>
        </div>

        {!token && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            Thiếu token đặt lại mật khẩu. Vui lòng dùng lại link được gửi qua email.
          </p>
        )}

        {done ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Đặt lại mật khẩu thành công.
            </p>
            <Link href="/login">
              <Button variant="blue" className="w-full">
                Đăng nhập ngay
              </Button>
            </Link>
          </div>
        ) : (
          token && (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <Field label="Mật khẩu mới" hint="Tối thiểu 6 ký tự">
                <div className="relative">
                  <Lock className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                  />
                </div>
              </Field>

              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </p>
              )}

              <Button type="submit" variant="blue" className="w-full" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </Button>
            </form>
          )
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
