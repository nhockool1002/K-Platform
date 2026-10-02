'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
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
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-10">
        <Logo size={28} />
      </Link>

      <h1 className="font-display text-ink text-2xl font-medium">Đặt lại mật khẩu</h1>

      {!token && (
        <p className="bg-ledger-red-bg text-ledger-red mt-4 border border-current/20 px-3 py-2 text-sm">
          Thiếu token đặt lại mật khẩu. Vui lòng dùng lại link được gửi qua email.
        </p>
      )}

      {done ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="bg-ledger-green-bg text-ledger-green border border-current/20 px-3 py-2 text-sm">
            Đặt lại mật khẩu thành công.
          </p>
          <Link href="/login">
            <Button className="w-full">Đăng nhập ngay</Button>
          </Link>
        </div>
      ) : (
        token && (
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink font-medium">Mật khẩu mới</span>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="border-line text-ink border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-navy"
              />
            </label>

            {error && (
              <p className="bg-ledger-red-bg text-ledger-red border border-current/20 px-3 py-2 text-xs">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </Button>
          </form>
        )
      )}
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
