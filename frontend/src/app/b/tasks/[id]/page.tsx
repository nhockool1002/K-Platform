'use client';

import { use, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Scale, Stamp, UploadCloud } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { PLATFORM_LABEL } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';
import { ApiError } from '@/lib/auth-client';
import {
  getSubmission,
  resolveUploadUrl,
  submitProof,
  type Submission,
} from '@/lib/submissions-client';
import { createDispute } from '@/lib/disputes-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'positive',
  REJECTED: 'critical',
  DISPUTED: 'purple',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ duyệt (đồng hồ 48h)',
  APPROVED: 'Đã duyệt — Đã cộng KPoint',
  REJECTED: 'Bị từ chối',
  DISPUTED: 'Đang khiếu nại (Dispute)',
};

const DISPUTE_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Đã gửi — Chờ Moderator thẩm định',
  RECOMMENDED: 'Moderator đã đề xuất — Chờ Admin phán quyết',
  RESOLVED: 'Đã có phán quyết cuối cùng',
};

// P4-07 — poll trong lúc chờ Watermark xử lý xong (watermarkUrl còn null).
const POLL_INTERVAL_MS = 4000;

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reviewUrl, setReviewUrl] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [disputeReason, setDisputeReason] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const s = await getSubmission(id);
        if (cancelled) return;
        setSubmission(s);
        // Còn đang xử lý Watermark (đã có proofUrl nhưng chưa có watermarkUrl) — poll tiếp.
        if (s.status === 'PENDING' && s.proofUrl && !s.watermarkUrl) {
          timer = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'Không tải được bài nộp');
        }
      }
    }
    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!file) {
      setSubmitError('Vui lòng chọn ảnh hoặc video bằng chứng');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await submitProof(id, file, {
        reviewUrl: reviewUrl || undefined,
        reviewNote: reviewNote || undefined,
      });
      setSubmission(updated);
      // Kích hoạt poll chờ Watermark ngay sau khi nộp thành công.
      setTimeout(async function poll() {
        const s = await getSubmission(id).catch(() => null);
        if (!s) return;
        setSubmission(s);
        if (s.status === 'PENDING' && s.proofUrl && !s.watermarkUrl) {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Không nộp được bằng chứng');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateDispute() {
    setDisputeError(null);
    if (disputeReason.trim().length < 5) {
      setDisputeError('Vui lòng nhập lý do khiếu nại (ít nhất 5 ký tự)');
      return;
    }

    setDisputing(true);
    try {
      await createDispute(id, disputeReason.trim());
      const updated = await getSubmission(id);
      setSubmission(updated);
      setDisputeOpen(false);
    } catch (err) {
      setDisputeError(err instanceof ApiError ? err.message : 'Không tạo được Dispute');
    } finally {
      setDisputing(false);
    }
  }

  if (loadError) {
    return (
      <AppShell role="publisher" active="/b/dashboard">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {loadError}
        </p>
      </AppShell>
    );
  }

  if (!submission) {
    return (
      <AppShell role="publisher" active="/b/dashboard">
        <p className="text-center text-xs text-slate-500">Đang tải...</p>
      </AppShell>
    );
  }

  const campaign = submission.campaign;
  const isWaitingWatermark =
    submission.status === 'PENDING' && submission.proofUrl && !submission.watermarkUrl;
  const isDone =
    submission.status === 'PENDING' ||
    submission.status === 'APPROVED' ||
    submission.status === 'REJECTED' ||
    submission.status === 'DISPUTED';

  return (
    <AppShell role="publisher" active="/b/dashboard">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Làm Survey & Nộp Bằng Chứng"
          description="Tải lên liên kết review và ảnh/video chụp thực tế. Hệ thống tự động chèn Watermark bản quyền."
        />

        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold text-brand-blue uppercase">
                Đang thực hiện cho:
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                {campaign ? campaign.title : submission.campaignId.slice(0, 8)}
              </h4>
              {campaign && (
                <span className="text-xs text-slate-500">
                  {PLATFORM_LABEL[campaign.platform]} • Thưởng:{' '}
                  {formatKpoint(Number(campaign.rewardPerSlot))}
                </span>
              )}
            </div>
            {isDone ? (
              <Badge tone={STATUS_TONE[submission.status]}>{STATUS_LABEL[submission.status]}</Badge>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                Auto-Approve: 48h tự động
              </div>
            )}
          </div>

          {isDone ? (
            <div className="space-y-4">
              {isWaitingWatermark ? (
                <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
                  Đang xử lý Watermark cho bằng chứng của bạn — tự làm mới...
                </div>
              ) : (
                submission.watermarkUrl && (
                  <div className="space-y-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Đã chèn Watermark
                    </span>
                    {/\.(mp4|webm|mov)$/i.test(submission.watermarkUrl) ? (
                      <video
                        src={resolveUploadUrl(submission.watermarkUrl)}
                        controls
                        className="max-h-96 w-full rounded-2xl border border-slate-200 bg-black"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- ảnh proof động từ backend, không qua Next/Image optimize
                      <img
                        src={resolveUploadUrl(submission.watermarkUrl)}
                        alt="Bằng chứng đã chèn Watermark"
                        className="max-h-96 w-full rounded-2xl border border-slate-200 object-contain"
                      />
                    )}
                  </div>
                )
              )}
              {submission.reviewUrl && (
                <p className="text-xs text-slate-600">
                  Link review:{' '}
                  <a
                    href={submission.reviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-brand-blue hover:underline"
                  >
                    {submission.reviewUrl}
                  </a>
                </p>
              )}
              {submission.reviewNote && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  {submission.reviewNote}
                </p>
              )}

              {submission.status === 'REJECTED' && submission.rejectReason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <strong className="block">Lý do Tài khoản Dịch vụ từ chối:</strong>
                  <p className="mt-0.5">{submission.rejectReason}</p>
                </div>
              )}

              {submission.status === 'REJECTED' && !submission.dispute && (
                <div className="space-y-2 rounded-xl border border-purple-200 bg-purple-50 p-3">
                  <div className="flex items-start gap-2 text-purple-900">
                    <Scale className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-[11px] leading-relaxed">
                      Bạn không đồng ý với quyết định từ chối này? Tạo Dispute để Moderator và Admin
                      K-Platform phân xử lại.
                    </p>
                  </div>
                  {disputeError && (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                      {disputeError}
                    </p>
                  )}
                  {disputeOpen ? (
                    <div className="space-y-2">
                      <Textarea
                        rows={3}
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Giải thích vì sao bạn cho rằng quyết định từ chối là không thỏa đáng..."
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="dark"
                          size="sm"
                          onClick={handleCreateDispute}
                          disabled={disputing}
                        >
                          {disputing ? 'Đang gửi...' : 'Gửi Khiếu Nại'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDisputeOpen(false)}
                          disabled={disputing}
                        >
                          Hủy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setDisputeOpen(true)}>
                      <Scale className="h-4 w-4" />
                      Tạo Dispute Khiếu Nại
                    </Button>
                  )}
                </div>
              )}

              {submission.dispute && (
                <div className="space-y-1 rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                  <strong className="flex items-center gap-1.5">
                    <Scale className="h-4 w-4" />
                    Dispute: {DISPUTE_STATUS_LABEL[submission.dispute.status]}
                  </strong>
                  <p className="text-[11px] text-purple-800">
                    Lý do bạn khiếu nại: &ldquo;{submission.dispute.reason}&rdquo;
                  </p>
                  {submission.dispute.finalDecision && (
                    <p className="font-bold">
                      Phán quyết cuối:{' '}
                      {submission.dispute.finalDecision === 'APPROVE'
                        ? 'Bạn thắng — Proof đã được duyệt, KPoint đã cộng vào Ví'
                        : 'Tài khoản Dịch vụ thắng — giữ nguyên quyết định từ chối'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form className="space-y-4 text-xs" onSubmit={handleSubmit}>
              {submitError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                  {submitError}
                </p>
              )}

              <Field label="Liên kết bài đánh giá công khai (Public Review URL)">
                <Input
                  type="url"
                  value={reviewUrl}
                  onChange={(e) => setReviewUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </Field>

              <Field label="Nội dung tóm tắt đánh giá của bạn">
                <Textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Không gian yên tĩnh, cà phê đậm vị hạt Arabica Cầu Đất, nhân viên phục vụ chu đáo..."
                />
              </Field>

              <Field label="Tải lên ảnh/video bằng chứng (Proof) *">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer space-y-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:bg-slate-100/70"
                >
                  <Camera className="mx-auto h-8 w-8 text-brand-blue" />
                  <div className="font-semibold text-slate-600">
                    {file
                      ? file.name
                      : 'Nhấp để chọn ảnh chụp màn hình review & hóa đơn, hoặc video'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Ảnh (PNG/JPG) hoặc video (MP4) — tối đa 50MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </Field>

              <div className="space-y-1 rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-brand-blue">
                  <Stamp className="h-4 w-4" />
                  <span>Cơ chế bảo mật SRS (FN-TASK-01):</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Ngay khi bạn tải lên, máy chủ sẽ tự động in chìm văn bản Watermark chứa{' '}
                  <code>UserID</code> + <code>CampaignID</code> và thời gian thực lên toàn bộ
                  ảnh/video nhằm ngăn chặn tuyệt đối việc tái sử dụng bằng chứng cho các chiến dịch
                  khác.
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-purple-200 bg-purple-50 p-3 text-purple-900">
                <Scale className="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
                <div className="text-[11px]">
                  <strong>Bảo vệ quyền lợi của bạn:</strong> Nếu Tài khoản Dịch vụ từ chối duyệt bài
                  nộp của bạn một cách không thỏa đáng, bạn có quyền tạo Dispute Khiếu Nại để
                  Moderator và Admin K-Platform đứng ra phân xử công bằng.
                </div>
              </div>

              <Button variant="blue" type="submit" className="w-full" disabled={submitting}>
                <UploadCloud className="h-4 w-4" />
                {submitting ? 'Đang gửi...' : 'Gửi Bài Nộp & Kích Hoạt Đồng Hồ 48h'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
