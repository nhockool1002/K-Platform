'use client';

import { useEffect, useState } from 'react';
import { Camera, Lock, Save } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { ApiError } from '@/lib/auth-client';
import { VN_PROVINCES } from '@/lib/vn-provinces';
import {
  avatarSrc,
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  type Gender,
  type MyProfile,
  type UpdateProfileInput,
} from '@/lib/profile-client';

const VN_PHONE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const BIO_MAX = 500;

export default function ProfilePage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<UpdateProfileInput>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setForm(toForm(p));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Không tải được hồ sơ');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof UpdateProfileInput>(k: K, v: UpdateProfileInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    if (form.phone && !VN_PHONE.test(form.phone.trim())) {
      setError('Số điện thoại không hợp lệ (vd. 0912345678)');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        ...form,
        fullName: form.fullName?.trim(),
        phone: form.phone?.trim(),
        occupation: form.occupation?.trim(),
        bio: form.bio?.trim(),
      });
      setProfile(updated);
      setForm(toForm(updated));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được hồ sơ');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const updated = await uploadAvatar(file);
      setProfile(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được ảnh đại diện');
    } finally {
      setUploading(false);
    }
  }

  const initials = (profile?.fullName || profile?.email || '?').trim().charAt(0).toUpperCase();
  const avatar = avatarSrc(profile?.avatarUrl ?? null);

  return (
    <AppShell active="/profile">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Hồ sơ của tôi</h1>
          <p className="mt-1 text-xs text-slate-500">Cập nhật thông tin và ảnh đại diện của bạn.</p>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt="Ảnh đại diện"
                className="h-24 w-24 rounded-full object-cover shadow"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-gold text-3xl font-extrabold text-slate-950 shadow">
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-1 text-center sm:text-left">
            <p className="text-sm font-extrabold text-slate-900">{profile?.fullName ?? '—'}</p>
            <p className="text-xs text-slate-500">
              Trust Score: <strong>{profile?.trustScore ?? '—'}</strong>
              {profile && (
                <span className="ml-2">
                  ·{' '}
                  {profile.serviceActivated
                    ? 'Tài khoản Dịch vụ đã kích hoạt'
                    : 'Chưa kích hoạt Tài khoản Dịch vụ'}
                </span>
              )}
            </p>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Camera className="h-3.5 w-3.5" />
              {uploading ? 'Đang tải...' : 'Đổi ảnh đại diện'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleAvatar(e.target.files?.[0])}
              />
            </label>
            <p className="text-[10px] text-slate-400">PNG, JPG hoặc WEBP, tối đa 2MB.</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <Field label="Email (không thể thay đổi)">
            <div className="relative">
              <Lock className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <Input value={profile?.email ?? ''} disabled className="pl-9" />
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">
              Muốn đổi email, liên hệ quản trị viên.
            </span>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Họ và tên">
              <Input
                value={form.fullName ?? ''}
                onChange={(e) => set('fullName', e.target.value)}
              />
            </Field>
            <Field label="Số điện thoại">
              <Input
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
              />
            </Field>
            <Field label="Ngày sinh">
              <Input
                type="date"
                value={form.dateOfBirth ?? ''}
                onChange={(e) => set('dateOfBirth', e.target.value)}
              />
            </Field>
            <Field label="Giới tính">
              <Select
                value={form.gender ?? ''}
                onChange={(e) => set('gender', e.target.value as Gender)}
              >
                <option value="">Chưa chọn</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </Select>
            </Field>
            <Field label="Tỉnh/Thành">
              <Select value={form.province ?? ''} onChange={(e) => set('province', e.target.value)}>
                <option value="">Chưa chọn</option>
                {VN_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nghề nghiệp">
              <Input
                value={form.occupation ?? ''}
                onChange={(e) => set('occupation', e.target.value)}
              />
            </Field>
          </div>

          <Field label={`Giới thiệu bản thân (${(form.bio ?? '').length}/${BIO_MAX})`}>
            <Textarea
              rows={4}
              maxLength={BIO_MAX}
              value={form.bio ?? ''}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="Vài dòng giới thiệu về bạn..."
            />
          </Field>

          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-xs font-bold text-emerald-600">Đã lưu.</span>}
            <Button variant="dark" disabled={saving || !profile} onClick={handleSave}>
              <Save className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function toForm(p: MyProfile): UpdateProfileInput {
  return {
    fullName: p.fullName ?? '',
    phone: p.phone ?? '',
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
    gender: p.gender ?? undefined,
    province: p.province ?? '',
    occupation: p.occupation ?? '',
    bio: p.bio ?? '',
  };
}
