import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { formatKpoint } from '@/lib/format';

const CREATION_FEE = 80_000;
const DEMO_SLOTS = 20;
const DEMO_PRICE = 25_000;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-ink font-medium">{label}</span>
      {children}
      {hint && <span className="text-ink-muted text-xs">{hint}</span>}
    </label>
  );
}

const inputClass =
  'border-line text-ink placeholder:text-ink-muted border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-navy';

export default function NewCampaignPage() {
  const total = CREATION_FEE + DEMO_SLOTS * DEMO_PRICE;

  return (
    <AppShell role="advertiser" active="/a/campaigns">
      <PageHeader
        eyebrow="Campaign mới"
        title="Tạo Campaign & Survey sàng lọc"
        description="Cấu hình slot, phần thưởng, và bộ câu hỏi để sàng lọc Bên B phù hợp trước khi mời tham gia."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <form className="flex flex-col gap-8">
          <fieldset className="border-line border-t pt-6">
            <legend className="font-display text-ink mb-4 text-base font-medium">
              Thông tin cơ bản
            </legend>
            <div className="flex flex-col gap-4">
              <Field label="Tên Campaign">
                <input
                  className={inputClass}
                  placeholder="Vd: Review quán cà phê Lữ — chi nhánh Q.1"
                />
              </Field>
              <Field label="Nền tảng đăng review">
                <select className={inputClass}>
                  <option>Google Maps</option>
                  <option>Facebook</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Số slot" hint="Số lượt review tối đa">
                  <input
                    type="number"
                    defaultValue={DEMO_SLOTS}
                    className={`${inputClass} font-ledger`}
                  />
                </Field>
                <Field label="Thưởng / slot (KPoint)">
                  <input
                    type="number"
                    defaultValue={DEMO_PRICE}
                    className={`${inputClass} font-ledger`}
                  />
                </Field>
              </div>
              <Field
                label="Giới hạn Drip-feed"
                hint="Số slot tối đa được duyệt mỗi ngày, tránh tăng review đột biến"
              >
                <input type="number" defaultValue={5} className={`${inputClass} font-ledger`} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="border-line border-t pt-6">
            <legend className="font-display text-ink mb-1 text-base font-medium">
              Survey sàng lọc Bên B
            </legend>
            <p className="text-ink-muted mb-4 text-sm">
              Câu hỏi bắt buộc trả lời trước khi được mời tham gia Campaign.
            </p>
            <div className="flex flex-col gap-3">
              {[
                'Bạn đã từng ghé địa điểm này trong 30 ngày qua chưa?',
                'Vui lòng mô tả ngắn trải nghiệm gần nhất của bạn tại đây.',
              ].map((q, i) => (
                <div key={i} className="border-line flex items-start gap-3 border p-3">
                  <span className="font-ledger text-ink-muted text-xs">{i + 1}</span>
                  <input
                    defaultValue={q}
                    className="text-ink flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              ))}
              <button
                type="button"
                className="border-line text-ink-muted hover:text-navy hover:border-navy border border-dashed px-3 py-2 text-left text-sm"
              >
                + Thêm câu hỏi
              </button>
            </div>
          </fieldset>
        </form>

        <aside className="border-line bg-paper-raised h-fit border p-5">
          <p className="text-ink-muted text-xs">Tổng KPoint cần khóa</p>
          <p className="font-ledger text-navy mt-1 text-2xl font-semibold">{formatKpoint(total)}</p>
          <div className="border-line mt-4 flex flex-col gap-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Phí khởi tạo</span>
              <span className="font-ledger text-ink">{formatKpoint(CREATION_FEE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">
                {DEMO_SLOTS} slot × {formatKpoint(DEMO_PRICE)}
              </span>
              <span className="font-ledger text-ink">{formatKpoint(DEMO_SLOTS * DEMO_PRICE)}</span>
            </div>
          </div>
          <p className="text-ink-muted mt-4 text-xs">
            Số dư sẽ bị khóa tạm (reserved) ngay khi Campaign chuyển trạng thái Active.
          </p>
          <Button className="mt-5 w-full">Khởi tạo Campaign</Button>
        </aside>
      </div>
    </AppShell>
  );
}
