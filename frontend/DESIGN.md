# K-Platform — Design Plan (Wireframe Pass)

> Viết theo quy trình skill `frontend-design`: plan → review với brief → build → tự critique.
> Đây là **wireframe fidelity** — đúng cấu trúc/bố cục theo SRS, dữ liệu mock
> (`src/lib/mock-data.ts`), chưa nối backend thật.

## Chất liệu đề bài

K-Platform không phải một SaaS dashboard chung chung. Nó là **sàn giao dịch lòng tin**: Bên A trả
KPoint để có review thật, Bên B đi trải nghiệm thật và nộp bằng chứng có đóng dấu watermark, Admin
là trọng tài xử lý tranh chấp. Cốt lõi sản phẩm là **một cuốn sổ cái nội bộ** (ví, giao dịch, audit
log) cộng với **bằng chứng được xác thực**. Hướng thiết kế bám theo hai ý niệm này, tránh "SaaS
card kit" (card bo tròn giống hệt nhau, shadow xám, gradient trang trí).

## Màu — 6 giá trị hex

| Token          | Hex       | Vai trò                                                                         |
| -------------- | --------- | ------------------------------------------------------------------------------- |
| `navy`         | `#1d4e89` | Thương hiệu, điều hướng, text nhấn                                              |
| `navy-dark`    | `#13324f` | Bề mặt tối (panel login), hover state                                           |
| `gold`         | `#e8a93a` | Giá trị/KPoint/phần thưởng                                                      |
| `paper`        | `#f3f5f8` | Nền — xám-xanh lạnh, **không** dùng be/cream ấm (tell của thiết kế AI mặc định) |
| `ledger-green` | `#2f9e6e` | Đã duyệt / cộng điểm                                                            |
| `ledger-red`   | `#c2483a` | Từ chối / tranh chấp                                                            |

Navy/gold giữ nguyên từ branding đã duyệt ở SRS — không phải lựa chọn mặc định của phiên làm việc
này, nên giữ nguyên dù hướng dẫn skill khuyến khích rủi ro thẩm mỹ.

## Chữ — 3 vai trò rõ ràng

- **Fraunces** (serif) — tiêu đề lớn, hero, số dư KPoint hero. Không dùng Inter/Geist mặc định.
- **IBM Plex Sans** — toàn bộ UI/body, rõ ràng ở mật độ cao (bảng, CMS).
- **IBM Plex Mono** (tabular figures) — **chỉ** số liệu tài chính (KPoint, bảng dữ liệu). Có lý do
  thật: căn cột số tiền cho dễ so sánh, không phải nhãn trang trí.

## Bố cục

Hai khung tách biệt:

1. **Public** (Trang chủ, Đăng nhập) — căn giữa/biên tập. Hero là **ô tìm Campaign thật** (form
   tìm kiếm chức năng), không phải minh họa trang trí — vì hành động đầu tiên người dùng thật sự
   làm trên trang này là tìm chiến dịch.
2. **App shell** (`AppShell.tsx`) — nav trái cố định theo vai trò (Advertiser/Publisher/Admin),
   nội dung dùng bảng kẻ dòng kiểu sổ cái thay vì lưới card.

## Dấu ấn riêng (chỉ 1 chỗ)

Mô-típ **"dòng sổ cái"** (`.ledger-row` trong `globals.css`): đường kẻ mảnh + chấm tick đầu dòng,
dùng cho Lịch sử giao dịch Ví (SCR-08) và Audit Logs (SCR-13) — nơi sản phẩm thật sự là một cuốn sổ
cái theo dõi KPoint. Không lặp lại mô-típ này ở nơi khác để giữ nó có ý nghĩa.

Mô-típ phụ: `CampaignTicketCard` dùng đường đứt nét ngăn cách phần thưởng — gợi "vé", gắn với việc
mỗi slot Campaign là một lượt review thật, không phải trang trí.

## Tự rà soát (đã loại bỏ)

- ❌ Gradient trang trí, shadow xám mặc định trên mọi card
- ❌ Nhãn eyebrow ALL-CAPS phía trên mọi heading
- ❌ Mũi tên "→" cuối nút/link
- ❌ Dấu chấm giữa (·) nối chuỗi meta (chỉ dùng ở audit log timestamp vì đúng quy ước log thật)
- ✅ Giữ `INFO`/`WARNING`/`CRITICAL` viết hoa ở Audit Logs — đây là hằng số kỹ thuật, đúng với
  chính thuật ngữ trong SRS Section III, không phải nhãn trang trí

## 13 màn hình đã build

Xem `/wireframes` (`src/app/wireframes/page.tsx`) để điều hướng nhanh — map đầy đủ SCR-01 → SCR-13
sang route thật trong `src/app/`.

## Việc còn lại trước Phase 1

- Đây là **wireframe**, chưa có logic thật (form không submit, không gọi API, không auth/switch
  mode thật). Backend/API nối vào theo đúng `TASK.md` từng Phase.
- Cần Product Owner duyệt layout/nội dung trước khi sang code production (xem backlog `B-01`
  trong `TASK.md`).
