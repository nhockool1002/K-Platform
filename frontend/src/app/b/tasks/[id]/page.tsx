import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { mockMyTasks } from '@/lib/mock-data';
import { formatKpoint } from '@/lib/format';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = mockMyTasks.find((t) => t.id === id) ?? mockMyTasks[0];

  return (
    <AppShell role="publisher" active="/b/dashboard">
      <PageHeader
        eyebrow={task.id}
        title={task.campaign}
        description={`Phần thưởng ${formatKpoint(task.reward)} — hoàn tất cả 2 bước để được xét duyệt.`}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="border-line border-t pt-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="font-ledger bg-navy flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white">
              1
            </span>
            <h2 className="font-display text-ink text-base font-medium">Trả lời Survey</h2>
          </div>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink font-medium">
                Bạn đã từng ghé địa điểm này trong 30 ngày qua chưa?
              </span>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="visited" /> Rồi
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="visited" /> Chưa
                </label>
              </div>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink font-medium">
                Mô tả ngắn trải nghiệm gần nhất của bạn tại đây
              </span>
              <textarea
                rows={3}
                className="border-line text-ink border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-navy"
                placeholder="Tôi đã ghé quán vào..."
              />
            </label>
          </div>
        </section>

        <section className="border-line border-t pt-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="font-ledger bg-navy flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white">
              2
            </span>
            <h2 className="font-display text-ink text-base font-medium">Nộp Proof</h2>
          </div>
          <div className="border-line flex flex-col items-center gap-2 border border-dashed px-6 py-10 text-center">
            <p className="text-ink text-sm font-medium">Kéo thả ảnh hoặc video vào đây</p>
            <p className="text-ink-muted text-xs">
              Hệ thống sẽ tự động đóng dấu UserID + CampaignID lên file trước khi gửi cho Bên A.
            </p>
            <button className="border-navy text-navy mt-2 border px-4 py-1.5 text-sm font-medium">
              Chọn file
            </button>
          </div>

          <Button className="mt-6 w-full">Gửi Survey &amp; Proof</Button>
        </section>
      </div>
    </AppShell>
  );
}
