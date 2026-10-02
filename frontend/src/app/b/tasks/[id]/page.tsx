import { Camera, Scale, Stamp, UploadCloud } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { PLATFORM_LABEL, mockMyTasks } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = mockMyTasks.find((t) => t.id === id) ?? mockMyTasks[0];

  return (
    <AppShell role="publisher" active="/b/dashboard">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Làm Survey & Nộp Bằng Chứng"
          description="Tải lên liên kết review và ảnh chụp thực tế. Hệ thống tự động chèn Watermark bản quyền."
        />

        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold text-brand-blue uppercase">
                Đang thực hiện cho:
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                {task.campaignId}: {task.campaign}
              </h4>
              <span className="text-xs text-slate-500">
                {PLATFORM_LABEL[task.platform]} • Thưởng: {formatKpoint(task.reward)}
              </span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
              Auto-Approve: 48h tự động
            </div>
          </div>

          <form className="space-y-4 text-xs">
            <Field label="Liên kết bài đánh giá công khai (Public Review URL) *">
              <Input type="url" required placeholder="https://maps.app.goo.gl/..." />
            </Field>

            <Field label="Nội dung tóm tắt đánh giá của bạn">
              <Textarea
                rows={3}
                placeholder="Không gian yên tĩnh, cà phê đậm vị hạt Arabica Cầu Đất, nhân viên phục vụ chu đáo..."
              />
            </Field>

            <Field label="Tải lên hình ảnh bằng chứng (Proof Image) *">
              <div className="cursor-pointer space-y-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:bg-slate-100/70">
                <Camera className="mx-auto h-8 w-8 text-brand-blue" />
                <div className="font-semibold text-slate-600">
                  Nhấp hoặc kéo thả ảnh chụp màn hình review &amp; hóa đơn vào đây
                </div>
                <div className="text-[10px] text-slate-400">Định dạng PNG, JPG (Tối đa 5MB)</div>
              </div>
            </Field>

            <div className="space-y-1 rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-brand-blue">
                <Stamp className="h-4 w-4" />
                <span>Cơ chế bảo mật SRS (FN-TASK-01):</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Ngay khi bạn tải lên, máy chủ sẽ tự động in chìm văn bản Watermark chứa{' '}
                <code>UserID</code> + <code>CampaignID ({task.campaignId})</code> và thời gian thực
                lên toàn bộ ảnh nhằm ngăn chặn tuyệt đối việc tái sử dụng bằng chứng cho các chiến
                dịch khác.
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-purple-200 bg-purple-50 p-3 text-purple-900">
              <Scale className="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
              <div className="text-[11px]">
                <strong>Bảo vệ quyền lợi Bên B:</strong> Nếu Bên A từ chối duyệt bài nộp của bạn một
                cách không thỏa đáng, bạn có quyền bấm{' '}
                <strong>&ldquo;Tạo Dispute Khiếu Nại&rdquo;</strong> để Moderator và Admin
                K-Platform đứng ra phân xử công bằng.
              </div>
            </div>

            <Button variant="blue" type="submit" className="w-full">
              <UploadCloud className="h-4 w-4" />
              Gửi Bài Nộp &amp; Kích Hoạt Đồng Hồ 48h
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
