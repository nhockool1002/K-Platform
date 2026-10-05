'use client';

import { useEffect, useState } from 'react';
import { History, Pencil, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '@/components/ui/Table';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import {
  getInternationalPaymentSettings,
  updateExchangeRate,
  updateReviewDays,
  getExchangeRateHistory,
  type InternationalPaymentSettings,
  type ExchangeRateHistoryRow,
} from '@/lib/settings-client';
import {
  createInternationalPackage,
  deleteInternationalPackage,
  listInternationalPackages,
  updateInternationalPackage,
  type AdminInternationalPackage,
  type SaveInternationalPackageInput,
} from '@/lib/admin-topups-client';

function RateSettings() {
  const perms = usePermissions();
  const canEditRate = perms.can('settings', 'UPDATE');
  const [settings, setSettings] = useState<InternationalPaymentSettings | null>(null);
  const [history, setHistory] = useState<ExchangeRateHistoryRow[] | null>(null);
  const [rateInput, setRateInput] = useState('');
  const [reviewDaysInput, setReviewDaysInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingRate, setSavingRate] = useState(false);
  const [savingReviewDays, setSavingReviewDays] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function load() {
    Promise.all([getInternationalPaymentSettings(), getExchangeRateHistory()])
      .then(([s, h]) => {
        setSettings(s);
        setHistory(h);
        setRateInput(String(s.usdToVnd));
        setReviewDaysInput(String(s.reviewDays));
        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : 'Không tải được cài đặt thanh toán quốc tế',
        );
      });
  }

  useEffect(load, []);

  async function handleSaveRate() {
    setError(null);
    const value = Number(rateInput);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Tỷ giá phải là số dương');
      return;
    }
    setSavingRate(true);
    try {
      await updateExchangeRate(value);
      load();
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được tỷ giá');
    } finally {
      setSavingRate(false);
    }
  }

  async function handleSaveReviewDays() {
    setError(null);
    const value = Number(reviewDaysInput);
    if (!Number.isInteger(value) || value <= 0) {
      setError('Thời gian đối soát phải là số nguyên dương');
      return;
    }
    setSavingReviewDays(true);
    try {
      await updateReviewDays(value);
      load();
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được thời gian đối soát');
    } finally {
      setSavingReviewDays(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        Chuẩn bị trước cho nạp quốc tế qua Buy Me a Coffee (Phase 6, B-02). Tỷ giá áp dụng theo{' '}
        <strong>thời điểm người dùng nạp</strong> — mỗi lần đổi tỷ giá tạo 1 dòng lịch sử mới, không
        ghi đè dòng cũ, để tra cứu/thống kê sau này.
      </p>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
      {savedAt && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Đã lưu.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase">Tỷ Giá USD → VNĐ</h4>
          <Field label="1 USD = ? VNĐ">
            <Input
              type="number"
              min={1}
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
            />
          </Field>
          {settings?.rateUpdatedAt && (
            <p className="text-[11px] text-slate-400">
              Áp dụng từ {new Date(settings.rateUpdatedAt).toLocaleString('vi-VN')}
            </p>
          )}
          <Button
            variant="dark"
            className="w-full"
            onClick={handleSaveRate}
            disabled={savingRate || !canEditRate}
          >
            <Save className="h-4 w-4" />
            {savingRate ? 'Đang lưu...' : 'Cập Nhật Tỷ Giá'}
          </Button>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase">
            Thời Gian Đối Soát (B-04)
          </h4>
          <Field label="Số ngày Admin phải đối soát">
            <Input
              type="number"
              min={1}
              value={reviewDaysInput}
              onChange={(e) => setReviewDaysInput(e.target.value)}
            />
          </Field>
          <p className="text-[11px] text-slate-400">Mặc định ~1 tuần (7 ngày).</p>
          <Button
            variant="dark"
            className="w-full"
            onClick={handleSaveReviewDays}
            disabled={savingReviewDays || !canEditRate}
          >
            <Save className="h-4 w-4" />
            {savingReviewDays ? 'Đang lưu...' : 'Cập Nhật Thời Gian'}
          </Button>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 p-5">
        <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 uppercase">
          <History className="h-3.5 w-3.5" />
          Lịch Sử Tỷ Giá
        </h4>
        {!history || history.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-slate-400">Chưa có lịch sử.</p>
        ) : (
          <Table>
            <Thead>
              <Th>Thời điểm</Th>
              <Th>Tỷ giá (1 USD)</Th>
              <Th>Người cập nhật</Th>
            </Thead>
            <Tbody>
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/70">
                  <Td>{new Date(h.createdAt).toLocaleString('vi-VN')}</Td>
                  <Td className="font-mono font-bold text-brand-blue">
                    {formatKpoint(h.usdToVnd)}
                  </Td>
                  <Td className="text-slate-500">{h.updatedBy ?? '—'}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM: SaveInternationalPackageInput = {
  name: '',
  amountUsd: 10,
  bmcUrl: '',
  active: true,
  sortOrder: 0,
};

function PackagesSection() {
  const perms = usePermissions();
  const canCreatePkg = perms.can('international_packages', 'CREATE');
  const canUpdatePkg = perms.can('international_packages', 'UPDATE');
  const canDeletePkg = perms.can('international_packages', 'DELETE');
  const [packages, setPackages] = useState<AdminInternationalPackage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminInternationalPackage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SaveInternationalPackageInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function load() {
    listInternationalPackages()
      .then((rows) => {
        setPackages(rows);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Không tải được gói nạp'));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sortOrder: (packages?.length ?? 0) * 10 + 10 });
    setModalOpen(true);
  }

  function openEdit(pkg: AdminInternationalPackage) {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      amountUsd: Number(pkg.amountUsd),
      bmcUrl: pkg.bmcUrl,
      active: pkg.active,
      sortOrder: pkg.sortOrder,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên gói');
      return;
    }
    if (!Number.isFinite(form.amountUsd) || form.amountUsd <= 0) {
      setError('Giá USD phải là số dương');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateInternationalPackage(editing.id, form);
      } else {
        await createInternationalPackage(form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được gói nạp');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pkg: AdminInternationalPackage) {
    if (!window.confirm(`Xoá gói "${pkg.name}"? Các giao dịch đã tạo vẫn giữ nguyên lịch sử.`)) {
      return;
    }
    setError(null);
    try {
      await deleteInternationalPackage(pkg.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xoá được gói nạp');
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-extrabold text-slate-700 uppercase">
            Gói Nạp Buy Me a Coffee
          </h4>
          <p className="mt-1 text-[11px] text-slate-500">
            Gói hiển thị cho user ở tab International Payment. Gói đã tắt sẽ ẩn khỏi user nhưng vẫn
            xem được trong lịch sử giao dịch.
          </p>
        </div>
        {canCreatePkg && (
          <Button variant="dark" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Thêm gói
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      {packages === null ? (
        <p className="py-4 text-center text-[11px] text-slate-400">Đang tải...</p>
      ) : packages.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-slate-400">Chưa có gói nạp nào.</p>
      ) : (
        <Table>
          <Thead>
            <Th>Tên gói</Th>
            <Th>Giá (USD)</Th>
            <Th>Link BMC</Th>
            <Th>Thứ tự</Th>
            <Th>Trạng thái</Th>
            <Th className="text-right">Thao tác</Th>
          </Thead>
          <Tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-slate-50/70">
                <Td className="font-bold text-slate-800">{pkg.name}</Td>
                <Td className="font-mono font-bold text-brand-blue">
                  ${Number(pkg.amountUsd).toFixed(2)}
                </Td>
                <Td className="max-w-[220px] truncate text-xs">
                  <a
                    href={pkg.bmcUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-blue underline"
                  >
                    {pkg.bmcUrl}
                  </a>
                </Td>
                <Td className="text-xs text-slate-500">{pkg.sortOrder}</Td>
                <Td>
                  <Badge tone={pkg.active ? 'positive' : 'neutral'}>
                    {pkg.active ? 'Đang bán' : 'Đã tắt'}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    {canUpdatePkg && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(pkg)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                    )}
                    {canDeletePkg && (
                      <Button variant="danger-ghost" size="sm" onClick={() => handleDelete(pkg)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Xoá
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa gói nạp' : 'Thêm gói nạp'}
      >
        <div className="space-y-3 text-xs">
          <Field label="Tên gói (hiển thị cho user)">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="$10 KPoint Credits — KPLATFORM"
            />
          </Field>
          <Field label="Giá (USD)">
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={form.amountUsd}
              onChange={(e) => setForm((f) => ({ ...f, amountUsd: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Link Buy Me a Coffee">
            <Input
              value={form.bmcUrl}
              onChange={(e) => setForm((f) => ({ ...f, bmcUrl: e.target.value }))}
              placeholder="https://buymeacoffee.com/..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Thứ tự hiển thị">
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Trạng thái">
              <select
                value={form.active ? 'on' : 'off'}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === 'on' }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="on">Đang bán</option>
                <option value="off">Tạm tắt</option>
              </select>
            </Field>
          </div>
          <Button
            variant="dark"
            className="w-full"
            onClick={handleSave}
            disabled={saving || !(editing ? canUpdatePkg : canCreatePkg)}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu gói'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function CmsInternationalSettingsPage() {
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const permsLoading = perms.loading;
  const isAdmin = perms.can('international_packages', 'READ');

  if (!userLoading && !permsLoading && !isAdmin) {
    return (
      <CmsShell active="/cms/settings/international">
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
    <CmsShell active="/cms/settings/international">
      <div className="space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">Thanh Toán Quốc Tế (BMC)</h3>
        </div>
        <RateSettings />
        <PackagesSection />
      </div>
    </CmsShell>
  );
}
