'use client';

import { useEffect, useState } from 'react';
import { Copy, QrCode, Save, ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import { getSepaySettings, updateSepaySettings, type SepaySettings } from '@/lib/settings-client';
import { VIETQR_BANKS } from '@/lib/wallet-client';

const WEBHOOK_PATH = '/payments/sepay-webhook';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function SepayTab() {
  const perms = usePermissions();
  const canEditSettings = perms.can('settings', 'UPDATE');
  const [settings, setSettings] = useState<SepaySettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    bankId: VIETQR_BANKS[0] as string,
    bankAccountNumber: '',
    bankAccountName: '',
    webhookApiKey: '',
  });
  const [previewAmount, setPreviewAmount] = useState('100000');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    getSepaySettings()
      .then((s) => {
        setSettings(s);
        setForm((f) => ({
          ...f,
          bankId: s.bankId || f.bankId,
          bankAccountNumber: s.bankAccountNumber,
          bankAccountName: s.bankAccountName,
        }));
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : 'Không tải được Cài đặt SePay');
      });
  }, []);

  async function handleSave() {
    setSaveError(null);
    if (!form.bankAccountNumber || !form.bankAccountName) {
      setSaveError('Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSepaySettings({
        bankId: form.bankId,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountName: form.bankAccountName,
        webhookApiKey: form.webhookApiKey.trim() || undefined,
      });
      setSettings(updated);
      setForm((f) => ({ ...f, webhookApiKey: '' }));
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Không lưu được Cài đặt SePay');
    } finally {
      setSaving(false);
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(`${API_URL}${WEBHOOK_PATH}`).catch(() => {});
  }

  const previewQrUrl =
    form.bankId && form.bankAccountNumber
      ? `https://img.vietqr.io/image/${encodeURIComponent(form.bankId)}-${encodeURIComponent(form.bankAccountNumber)}-compact2.png` +
        `?amount=${encodeURIComponent(previewAmount || '0')}&accountName=${encodeURIComponent(form.bankAccountName)}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">
          Cấu hình nhận nạp tiền qua VietQR + webhook SePay (FN-PAY-01). Webhook URL cần khai trong
          dashboard SePay — chọn chế độ xác thực <strong>API Key</strong>, dán đúng key đã nhập bên
          dưới.
        </p>
        <button
          onClick={copyWebhookUrl}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-[11px] font-bold text-brand-blue hover:bg-blue-100"
        >
          {API_URL}
          {WEBHOOK_PATH}
          <Copy className="h-3 w-3" />
        </button>
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
          Đã lưu Cài đặt SePay.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase">Tài Khoản Ngân Hàng</h4>

          <Field label="Ngân hàng">
            <Select
              value={form.bankId}
              onChange={(e) => setForm((f) => ({ ...f, bankId: e.target.value }))}
            >
              {VIETQR_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Số tài khoản">
            <Input
              value={form.bankAccountNumber}
              onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))}
              placeholder="0123456789"
            />
          </Field>
          <Field label="Tên chủ tài khoản">
            <Input
              value={form.bankAccountName}
              onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))}
              placeholder="CONG TY K PLATFORM"
            />
          </Field>
          <Field label="Webhook API Key">
            <Input
              type="password"
              value={form.webhookApiKey}
              onChange={(e) => setForm((f) => ({ ...f, webhookApiKey: e.target.value }))}
              placeholder={
                settings?.hasWebhookApiKey ? '•••••••• (đã cấu hình)' : 'Dán API Key từ SePay'
              }
            />
          </Field>

          <Button
            variant="dark"
            className="w-full"
            onClick={handleSave}
            disabled={saving || !canEditSettings}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu Cài Đặt'}
          </Button>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 p-5 text-center">
          <h4 className="text-left text-xs font-extrabold text-slate-700 uppercase">Xem Thử QR</h4>
          <Field label="Số tiền">
            <Input
              type="number"
              min={1000}
              step={1000}
              value={previewAmount}
              onChange={(e) => setPreviewAmount(e.target.value)}
            />
          </Field>
          {previewQrUrl ? (
            <div className="inline-block rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh QR động từ img.vietqr.io, không qua Next/Image optimize */}
              <img src={previewQrUrl} alt="Xem thử QR VietQR" className="h-48 w-48" />
            </div>
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
              <QrCode className="h-10 w-10" />
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            Nhập Ngân hàng + Số tài khoản bên trái để xem QR thật.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CmsPaymentsSettingsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const permsLoading = perms.loading;
  const isAdmin = perms.can('settings', 'READ');

  if (!userLoading && !permsLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/settings/payments">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Bạn chưa được cấp quyền truy cập chức năng này. Liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </CmsShell>
    );
  }

  return (
    <CmsShell active="/cms/settings/payments">
      <div className="space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">Cài Đặt SePay (Nội địa)</h3>
        </div>

        <SepayTab />
      </div>
    </CmsShell>
  );
}
