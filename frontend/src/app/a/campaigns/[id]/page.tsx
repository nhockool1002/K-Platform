import { Check, Image as ImageIcon, Send } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatKpoint } from '@/lib/format';
import { mockApplicants, mockCampaigns, mockSubmissions } from '@/lib/mock-data';

export default async function ManageCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = mockCampaigns.find((c) => c.id === id) ?? mockCampaigns[0];
  const submission =
    mockSubmissions.find((s) => s.campaignId === campaign.id) ?? mockSubmissions[0];
  const applicant = mockApplicants[0];

  return (
    <AppShell role="advertiser" active="/a/campaigns">
      <div className="space-y-6">
        <PageHeader
          title={`Quản Lý Campaign & Xét Duyệt Bài Nộp — ${campaign.id}`}
          description="Xem danh sách ứng viên Bên B, xét duyệt khảo sát và thẩm định ảnh review có đóng Watermark."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1: Chờ duyệt Proof */}
          <Card rounded="3xl" className="space-y-4 border-2 border-amber-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                  SUBMISSION #{submission.id}
                </span>
                <h4 className="mt-1 text-base font-extrabold text-slate-900">
                  Ứng viên: {submission.applicant} (Trust: {submission.trustScore})
                </h4>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-slate-400">Thời gian đếm ngược 48h:</span>
                <span className="font-mono text-xs font-bold text-rose-600">
                  Còn {submission.hoursLeft} giờ {submission.minutesLeft} phút
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-700">
                Hình ảnh bằng chứng review (Đã chèn Watermark hệ thống):
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-center">
                <div className="watermark-overlay space-y-2 rounded-xl border border-dashed border-slate-300 p-6">
                  <ImageIcon className="mx-auto h-8 w-8 text-brand-blue" />
                  <span className="block text-xs font-bold text-slate-800">
                    {submission.proofNote}
                  </span>
                  <div className="inline-block rounded border border-blue-200 bg-white/80 px-2 py-1 font-mono text-[10px] font-bold text-brand-blue">
                    WATERMARK: {submission.watermark}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Link công khai:{' '}
                  <a href="#" className="font-mono text-brand-blue underline">
                    {submission.reviewUrl}
                  </a>
                </span>
                <span className="font-bold text-emerald-600">● Đã xác thực vị trí GPS</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700">
                <Check className="h-4 w-4" />
                Duyệt &amp; Giải Ngân {formatKpoint(submission.reward)}
              </button>
              <Button variant="danger-ghost">Từ chối</Button>
            </div>
          </Card>

          {/* Card 2: Chờ xét duyệt Survey ứng tuyển */}
          <Card rounded="3xl" className="space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-blue">
                  APPLICATION #{applicant.id}
                </span>
                <h4 className="mt-1 text-base font-extrabold text-slate-900">
                  Ứng viên: {applicant.name} (Trust: {applicant.trustScore})
                </h4>
              </div>
              <span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                Chờ Invite
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Câu trả lời khảo sát:</span>
                <p className="text-slate-600">&ldquo;{applicant.surveyAnswer}&rdquo;</p>
                <div className="text-[11px] font-medium text-emerald-600">
                  ✓ Đạt tiêu chí Trust Score ≥ 80
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Fingerprint &amp; Chống Clone:</span>
                <span className="block font-mono text-[10px] text-slate-500">
                  Device Hash: {applicant.deviceHash} • IP: {applicant.ip} (Hợp lệ)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <Button variant="gold" className="flex-1">
                <Send className="h-4 w-4" />
                Chấp Nhận (Invite Làm Review)
              </Button>
              <Button variant="outline">Loại</Button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
