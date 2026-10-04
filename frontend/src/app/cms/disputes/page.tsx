'use client';

import { useEffect, useState } from 'react';
import { Scale, Settings as SettingsIcon, ShieldAlert } from 'lucide-react';
import { CmsShell } from '@/components/layout/CmsShell';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Input';
import { formatKpoint } from '@/lib/format';
import { PLATFORM_LABEL } from '@/lib/mock-data';
import { ApiError } from '@/lib/auth-client';
import { useCurrentUser } from '@/lib/use-current-user';
import {
  listDisputes,
  recommendDispute,
  resolveDispute,
  type DisputeDetail,
  type DisputeStatus,
} from '@/lib/admin-disputes-client';
import { getDisputeSla, updateDisputeSla } from '@/lib/settings-client';
import { resolveUploadUrl } from '@/lib/submissions-client';

const STATUS_TABS: { key: DisputeStatus | 'ALL'; label: string }[] = [
  { key: 'OPEN', label: 'Mới — Chờ Moderator' },
  { key: 'RECOMMENDED', label: 'Đã đề xuất — Chờ Admin' },
  { key: 'RESOLVED', label: 'Đã phán quyết' },
  { key: 'ALL', label: 'Tất cả' },
];

const STATUS_TONE: Record<DisputeStatus, BadgeTone> = {
  OPEN: 'warning',
  RECOMMENDED: 'info',
  RESOLVED: 'neutral',
};

const STATUS_LABEL: Record<DisputeStatus, string> = {
  OPEN: 'Đang Thẩm Định',
  RECOMMENDED: 'Đã Đề Xuất',
  RESOLVED: 'Đã Phán Quyết',
};

const REC_LABEL: Record<string, string> = {
  PEND_APP: 'Pend Approval (nghiêng về Bên B)',
  PEND_REJ: 'Pend Reject (nghiêng về Bên A)',
};

export default function DisputeCenterPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const isModerator = user?.role === 'MODERATOR';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROOT_ADMIN';
  const canView = isModerator || isAdmin;

  const [tab, setTab] = useState<DisputeStatus | 'ALL'>('OPEN');
  const [disputes, setDisputes] = useState<DisputeDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // B-03/B-04 — Modal "Cài đặt SLA", chỉ Admin/Root Admin thấy + chỉnh được.
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [slaForm, setSlaForm] = useState({ moderatorHours: '12', adminHours: '24' });
  const [slaSaving, setSlaSaving] = useState(false);
  const [slaError, setSlaError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) return;

    let cancelled = false;
    listDisputes(tab === 'ALL' ? undefined : tab)
      .then((data) => {
        if (cancelled) return;
        setDisputes(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Không tải được danh sách Dispute');
        setDisputes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [canView, tab, reloadTick]);

  async function handleRecommend(id: string, recommendation: 'PEND_APP' | 'PEND_REJ') {
    setProcessingId(id);
    setError(null);
    try {
      await recommendDispute(id, recommendation);
      setReloadTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đề xuất được');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleResolve(id: string, decision: 'APPROVE' | 'REJECT') {
    setProcessingId(id);
    setError(null);
    try {
      await resolveDispute(id, decision);
      setReloadTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không phán quyết được');
    } finally {
      setProcessingId(null);
    }
  }

  async function openSlaModal() {
    setSlaError(null);
    setSlaModalOpen(true);
    try {
      const sla = await getDisputeSla();
      setSlaForm({
        moderatorHours: String(sla.moderatorHours),
        adminHours: String(sla.adminHours),
      });
    } catch (err) {
      setSlaError(err instanceof ApiError ? err.message : 'Không tải được cài đặt SLA');
    }
  }

  async function handleSaveSla() {
    setSlaError(null);
    const moderatorHours = Number(slaForm.moderatorHours);
    const adminHours = Number(slaForm.adminHours);
    if (!Number.isInteger(moderatorHours) || moderatorHours <= 0) {
      setSlaError('Thời gian Moderator phải là số nguyên dương');
      return;
    }
    if (!Number.isInteger(adminHours) || adminHours <= 0) {
      setSlaError('Thời gian Admin phải là số nguyên dương');
      return;
    }

    setSlaSaving(true);
    try {
      await updateDisputeSla({ moderatorHours, adminHours });
      setSlaModalOpen(false);
      setReloadTick((t) => t + 1);
    } catch (err) {
      setSlaError(err instanceof ApiError ? err.message : 'Không lưu được cài đặt SLA');
    } finally {
      setSlaSaving(false);
    }
  }

  if (!userLoading && !canView) {
    return (
      <CmsShell active="/cms/disputes">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">Không đủ quyền truy cập</p>
          <p className="text-xs text-slate-500">
            Chỉ Moderator, Admin hoặc Root Admin được xem Dispute Center.
          </p>
        </div>
      </CmsShell>
    );
  }

  return (
    <CmsShell active="/cms/disputes">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              SCR-11: CMS Dispute Center (Tranh Chấp 2 Cấp)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Bên B tạo Khiếu nại khi Proof bị từ chối → Moderator xem bằng chứng 2 bên và đề xuất
              Pend Approval/Pend Reject → Admin ra phán quyết cuối cùng, giải phóng KPoint đúng bên
              thắng. Quá hạn SLA Moderator thì Admin được phán quyết thẳng (leo thang).
            </p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={openSlaModal}>
              <SettingsIcon className="h-3.5 w-3.5" />
              Cài Đặt SLA
            </Button>
          )}
        </div>

        <div className="flex gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tab === t.key
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {disputes === null ? (
          <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
        ) : disputes.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">Không có Dispute nào.</p>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => {
              const { submission } = d;
              const { campaign, publisher } = submission;
              const watermark = submission.watermarkUrl;
              return (
                <div
                  key={d.id}
                  className="space-y-3 rounded-2xl border-2 border-purple-200 bg-purple-50/20 p-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-purple-900">
                      CASE #{d.id.slice(0, 8)} • {campaign.title} (
                      {PLATFORM_LABEL[campaign.platform]}) • KPoint:{' '}
                      {formatKpoint(Number(campaign.rewardPerSlot))}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {d.status === 'OPEN' && d.sla.isOverdueModerator && (
                        <Badge tone="critical">Quá Hạn Moderator</Badge>
                      )}
                      {d.status !== 'RESOLVED' && d.sla.isOverdueAdmin && (
                        <Badge tone="critical">Quá Hạn Admin</Badge>
                      )}
                      <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
                      <strong className="block text-amber-700">
                        Lý do Tài khoản Dịch vụ từ chối — {campaign.owner.email}
                      </strong>
                      <p className="text-slate-600">
                        &ldquo;{submission.rejectReason || 'Không có lý do cụ thể'}&rdquo;
                      </p>
                    </div>
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                      <strong className="block text-brand-blue">
                        Tài khoản Người dùng khiếu nại — {publisher.email} (Trust:{' '}
                        {publisher.trustScore})
                      </strong>
                      <p className="text-slate-600">&ldquo;{d.reason}&rdquo;</p>
                      {watermark && (
                        <div className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                          {/\.(mp4|webm|mov)$/i.test(watermark) ? (
                            <video
                              src={resolveUploadUrl(watermark)}
                              controls
                              className="max-h-48 w-full bg-black"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element -- ảnh proof động từ backend
                            <img
                              src={resolveUploadUrl(watermark)}
                              alt="Bằng chứng đã chèn Watermark"
                              className="max-h-48 w-full object-contain"
                            />
                          )}
                        </div>
                      )}
                      {submission.reviewUrl && (
                        <a
                          href={submission.reviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block font-bold text-brand-blue hover:underline"
                        >
                          {submission.reviewUrl}
                        </a>
                      )}
                    </div>
                  </div>

                  {d.modRecommendation && (
                    <p className="text-xs text-slate-600">
                      <strong>Đề xuất Moderator:</strong> {REC_LABEL[d.modRecommendation]}
                      {d.moderator && ` — ${d.moderator.email}`}
                    </p>
                  )}
                  {d.finalDecision && (
                    <p className="text-xs font-bold text-slate-800">
                      Phán quyết cuối:{' '}
                      {d.finalDecision === 'APPROVE'
                        ? 'Thắng Tài khoản Người dùng — đã trả thưởng'
                        : 'Thắng Tài khoản Dịch vụ — giữ nguyên từ chối'}
                      {d.admin && ` (${d.admin.email})`}
                    </p>
                  )}

                  {(d.status === 'OPEN' || d.status === 'RECOMMENDED') && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-purple-100 pt-2 text-xs">
                      {isModerator || isAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-600">Moderator:</span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={d.status !== 'OPEN' || processingId === d.id}
                            onClick={() => handleRecommend(d.id, 'PEND_APP')}
                          >
                            Pend App
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={d.status !== 'OPEN' || processingId === d.id}
                            onClick={() => handleRecommend(d.id, 'PEND_REJ')}
                          >
                            Pend Reject
                          </Button>
                        </div>
                      ) : (
                        <span />
                      )}
                      {isAdmin &&
                        (() => {
                          const canResolve =
                            d.status === 'RECOMMENDED' ||
                            (d.status === 'OPEN' && d.sla.isOverdueModerator);
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-600">
                                Admin Phán Quyết
                                {d.status === 'OPEN' && d.sla.isOverdueModerator && ' (leo thang)'}:
                              </span>
                              <Button
                                variant="dark"
                                size="sm"
                                disabled={!canResolve || processingId === d.id}
                                onClick={() => handleResolve(d.id, 'APPROVE')}
                              >
                                <Scale className="h-3.5 w-3.5" />
                                Thắng Tài Khoản Người Dùng
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!canResolve || processingId === d.id}
                                onClick={() => handleResolve(d.id, 'REJECT')}
                              >
                                Thắng Tài Khoản Dịch Vụ
                              </Button>
                            </div>
                          );
                        })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={slaModalOpen}
        onClose={() => setSlaModalOpen(false)}
        eyebrow="B-03/B-04"
        title="Cài Đặt SLA Dispute"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setSlaModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="dark" size="sm" onClick={handleSaveSla} disabled={slaSaving}>
              {slaSaving ? 'Đang lưu...' : 'Lưu Cài Đặt'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Moderator phải đề xuất trong khung giờ đầu; quá hạn Admin được phán quyết thẳng (leo
            thang). Admin phải chốt phán quyết trong khung giờ sau (chỉ hiển thị cảnh báo, không tự
            động xử lý thêm).
          </p>
          {slaError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {slaError}
            </p>
          )}
          <Field label="Hạn Moderator đề xuất (giờ)">
            <Input
              type="number"
              min={1}
              value={slaForm.moderatorHours}
              onChange={(e) => setSlaForm((f) => ({ ...f, moderatorHours: e.target.value }))}
            />
          </Field>
          <Field label="Hạn Admin phán quyết (giờ, tính từ lúc tạo Dispute)">
            <Input
              type="number"
              min={1}
              value={slaForm.adminHours}
              onChange={(e) => setSlaForm((f) => ({ ...f, adminHours: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>
    </CmsShell>
  );
}
