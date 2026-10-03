'use client';

import { useEffect, useState } from 'react';
import { Save, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { getActivationFeeSettings, updateActivationFeeSettings } from '@/lib/settings-client';

export default function CmsActivationFeeSettingsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROOT_ADMIN';

  const [loadError, setLoadError] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('50000');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    getActivationFeeSettings()
      .then((s) => setAmountInput(s.amountKpoint))
      .catch((err) => {
        setLoadError(
          err instanceof ApiError ? err.message : 'Không tải được Cài đặt phí kích hoạt',
        );
      });
  }, [isAdmin]);

  async function handleSave() {
    setSaveError(null);
    const amount = Number(amountInput);
    if (!Number.isInteger(amount) || amount < 0) {
      setSaveError('Số KPoint phải là số nguyên không âm');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateActivationFeeSettings(amount);
      setAmountInput(updated.amountKpoint);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Không lưu được Cài đặt phí kích hoạt');
    } finally {
      setSaving(false);
    }
  }

  if (!userLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/settings/activation-fee">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Chỉ Admin hoặc Root Admin được xem/sửa Cài đặt phí kích hoạt.
          </p>
        </div>
      </CmsShell>
    );
  }

  return (
    <CmsShell active="/cms/settings/activation-fee">
      <div className="space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">Cài Đặt Phí Kích Hoạt</h3>
          <p className="mt-1 text-xs text-slate-500">
            Chuyển sang Tài khoản Dịch vụ luôn miễn phí, nhưng tài khoản sẽ ở trạng thái{' '}
            <strong>chưa kích hoạt</strong> — không được tạo Campaign — cho tới khi trả phí kích
            hoạt 1 lần dưới đây. Thay đổi chỉ áp dụng cho các lần kích hoạt sau, không ảnh hưởng tài
            khoản đã kích hoạt trước đó.
          </p>
        </div>

        {loadError && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {loadError}
          </p>
        )}
        {saveError && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {saveError}
          </p>
        )}
        {savedAt && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Đã lưu Cài đặt phí kích hoạt.
          </p>
        )}

        <div className="max-w-sm space-y-4 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase">
            <ShieldCheck className="h-4 w-4 text-brand-gold" />
            Phí Kích Hoạt (KPoint)
          </div>
          <Field label="Số KPoint">
            <Input
              type="number"
              min={0}
              step={1000}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </Field>
          <p className="text-[11px] text-slate-400">
            = {formatKpoint(Number(amountInput) || 0)} KPoint (1 KPoint = 1 VNĐ)
          </p>
          <Button variant="dark" className="w-full" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu Cài Đặt'}
          </Button>
        </div>
      </div>
    </CmsShell>
  );
}
