'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { PLATFORM_LABEL } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import { usePermissions } from '@/lib/use-permissions';
import {
  archiveAdminCampaign,
  getAdminCampaign,
  updateAdminCampaign,
  type AdminCampaignDetail,
} from '@/lib/admin-campaigns-client';

// SCR-21 — chi tiết & xử lý Campaign: xem tiến độ slot, sửa thông tin hiển thị,
// lưu trữ (= "xoá" trong CMS, không xoá cứng) và hoàn ký quỹ slot chưa dùng.
export default function CmsCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { loading: userLoading } = useCurrentUser();
  const perms = usePermissions();
  const canRead = perms.can('campaigns', 'READ');
  const canUpdate = perms.can('campaigns', 'UPDATE');
  const canArchive = perms.can('campaigns', 'DELETE');

  const [campaign, setCampaign] = useState<AdminCampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [busy, setBusy] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const refresh = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!canRead || !id) return;
    let cancelled = false;
    getAdminCampaign(id)
      .then((c) => {
        if (cancelled) return;
        setCampaign(c);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Không tải được Campaign');
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, id, reloadKey]);

  async function handleSave(patch: { title: string; location: string; minTrustScore: number }) {
    setBusy(true);
    setError(null);
    try {
      await updateAdminCampaign(id, patch);
      refresh();
      setInfo('Đã lưu thay đổi.');
      setTimeout(() => setInfo(null), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được thay đổi');
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    setBusy(true);
    setError(null);
    try {
      const res = await archiveAdminCampaign(id);
      setConfirmArchive(false);
      refresh();
      setInfo(
        `Đã lưu trữ. Hoàn ${formatKpoint(Number(res.refundedKpoint))} ký quỹ cho ${res.refundedSlots} slot chưa dùng.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu trữ được Campaign');
    } finally {
      setBusy(false);
    }
  }

  if (!userLoading && !perms.loading && !canRead) {
    return (
      <CmsShell active="/cms/campaigns">
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
    <CmsShell active="/cms/campaigns">
      <div className="space-y-4">
        <Link
          href="/cms/campaigns"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Quản Trị Campaign
        </Link>

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

        {!campaign ? (
          <p className="py-10 text-center text-sm text-slate-400">Đang tải...</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{campaign.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {PLATFORM_LABEL[campaign.platform]} · Chủ sở hữu: {campaign.owner.email}
                </p>
              </div>
              <Badge tone={campaign.status === 'ACTIVE' ? 'positive' : 'neutral'}>
                {campaign.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã lưu trữ'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Slot đã chiếm"
                value={`${campaign.slotsOccupied}/${campaign.totalSlots}`}
              />
              <Stat label="Thưởng / slot" value={formatKpoint(Number(campaign.rewardPerSlot))} />
              <Stat
                label="Ký quỹ còn lại"
                value={formatKpoint(Number(campaign.refundableKpoint))}
              />
              <Stat label="Điểm Trust tối thiểu" value={String(campaign.minTrustScore)} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-bold text-slate-700">Proof theo trạng thái</p>
              {Object.keys(campaign.statusCounts).length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có ứng viên nào.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(campaign.statusCounts).map(([s, n]) => (
                    <Badge key={s} tone="neutral">
                      {s}: {n}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <EditForm
              key={
                campaign.id + campaign.title + (campaign.location ?? '') + campaign.minTrustScore
              }
              initial={campaign}
              disabled={!canUpdate || busy || campaign.status !== 'ACTIVE'}
              onSave={handleSave}
            />

            {canArchive && campaign.status === 'ACTIVE' && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                <p className="text-xs font-bold text-rose-800">Lưu trữ Campaign</p>
                <p className="mt-1 text-xs text-rose-700">
                  Campaign sẽ ngừng nhận ứng viên mới. Ký quỹ của các slot chưa dùng (
                  {formatKpoint(Number(campaign.refundableKpoint))}) được hoàn về số dư khả dụng của
                  chủ Campaign. Proof đang chờ vẫn được xử lý bình thường. Hành động này không hoàn
                  tác.
                </p>
                {confirmArchive ? (
                  <div className="mt-3 flex gap-2">
                    <Button variant="danger" size="sm" disabled={busy} onClick={handleArchive}>
                      Xác nhận lưu trữ
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(false)}>
                      Huỷ
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => setConfirmArchive(true)}
                  >
                    Lưu trữ Campaign
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </CmsShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-sm font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function EditForm({
  initial,
  disabled,
  onSave,
}: {
  initial: AdminCampaignDetail;
  disabled: boolean;
  onSave: (patch: { title: string; location: string; minTrustScore: number }) => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [location, setLocation] = useState(initial.location ?? '');
  const [minTrust, setMinTrust] = useState(String(initial.minTrustScore));

  const score = Number(minTrust);
  const valid = title.trim().length >= 3 && Number.isInteger(score) && score >= 0 && score <= 100;

  return (
    <form
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ title: title.trim(), location: location.trim(), minTrustScore: score });
      }}
    >
      <p className="text-xs font-bold text-slate-700">Thông tin hiển thị</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Tiêu đề">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Địa điểm">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Điểm Trust tối thiểu (0–100)">
          <Input
            type="number"
            min={0}
            max={100}
            value={minTrust}
            onChange={(e) => setMinTrust(e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>
      <p className="text-[11px] text-slate-500">
        Thưởng và số slot không sửa được sau khi tạo, vì đã khoá vào ký quỹ.
      </p>
      <Button variant="blue" size="sm" type="submit" disabled={disabled || !valid}>
        Lưu thay đổi
      </Button>
    </form>
  );
}
