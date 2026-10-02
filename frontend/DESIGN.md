# K-Platform — Design System v2 (13 màn hình SRS)

> Bản thiết kế hiện tại **thay thế hoàn toàn** bản v1 (navy/gold/Fraunces, mô-típ "sổ cái").
> Nguồn: wireframe tham khảo do Product Owner cung cấp (`k_platform_wireframe_system (1).html`,
> 13 màn hình SCR-01 → SCR-13 theo SRS). Yêu cầu: bám sát 100% màu sắc/typography/layout của
> wireframe, đồng thời giữ nguyên toàn bộ logic thật đã có (auth, switch-mode, mock data) — đây
> vẫn là **wireframe fidelity pass** (`src/lib/mock-data.ts`), chưa nối hết backend thật.

## Chất liệu đề bài

K-Platform là sàn giao dịch lòng tin giữa Bên A (doanh nghiệp cần review thật) và Bên B (người
tiêu dùng trải nghiệm thật, nộp bằng chứng có watermark, nhận KPoint). CMS là trọng tài xử lý
tranh chấp và đối soát tài chính. Bản thiết kế này ưu tiên **đúng 100% theo wireframe đã duyệt**
thay vì tự do sáng tạo — branding (xanh dương/vàng gold) đã chốt từ logo chính thức.

## Màu — theo đúng cấu hình Tailwind trong wireframe

| Token              | Hex       | Vai trò                                            |
| ------------------ | --------- | -------------------------------------------------- |
| `brand-blue`       | `#195B9B` | Thương hiệu chính, nav, nút hành động chính        |
| `brand-blue-dark`  | `#0F3C69` | Hover state của brand-blue, panel tối              |
| `brand-blue-light` | `#EBF3FA` | Nền nhạt cho badge/khối nhấn xanh                  |
| `brand-gold`       | `#E69A19` | CTA chính (tạo Campaign, duyệt), biểu trưng KPoint |
| `brand-gold-hover` | `#CE850E` | Hover state của brand-gold                         |
| `brand-gold-light` | `#FEF7EA` | Nền nhạt cho badge/khối nhấn vàng                  |
| `brand-slate`      | `#1E293B` | Dự phòng, hiếm dùng trực tiếp                      |

Toàn bộ màu nền/trạng thái còn lại (`slate-*`, `emerald-*`, `amber-*`, `rose-*`, `purple-*`,
`blue-*`) dùng thẳng thang màu có sẵn của Tailwind — **không** định nghĩa token riêng, đúng như
wireframe gốc. Định nghĩa ở `src/app/globals.css` (`@theme inline`, Tailwind v4 CSS-based config).

## Chữ — 2 vai trò

- **Inter** (`--font-sans`) — toàn bộ heading + body. Heading dùng `font-extrabold tracking-tight`,
  không dùng serif.
- **JetBrains Mono** (`--font-mono`) — số liệu tài chính (KPoint, bảng dữ liệu, mã giao dịch,
  audit log, JSON diff) qua class `.font-mono` / `font-mono` của Tailwind.

Không dùng Fraunces/IBM Plex (đã gỡ khỏi `layout.tsx`).

## Icon

`lucide-react` — khớp bộ icon Lucide mà wireframe dùng qua CDN. Dùng có chủ đích (điều hướng,
trạng thái, hành động), không trang trí tràn lan.

## Bố cục

1. **Public** (Trang chủ SCR-01, Đăng nhập/Đăng ký SCR-02): nền `slate-50`, card bo `rounded-2xl`
   /`rounded-3xl`, border `slate-200`, shadow nhẹ. Trang chủ có hero 2 cột (value prop + infographic
   quy trình 3 bước) và lưới Campaign dạng "vé" (`CampaignTicketCard`).
2. **App shell** (`AppShell.tsx`) — áp dụng cho Bên A/Bên B (`a/*`, `b/*`, `/wallet`): header trên
   cùng (không sidebar, khác v1) gồm logo, nav theo vai trò, pill Switch Mode (FN-AUTH-01), badge
   số dư ví, nút đăng xuất. Nội dung chính dùng lưới KPI (`KpiCard`) + bảng dữ liệu phẳng
   (`Table`/`Thead`/`Tbody`), không dùng card-grid đồng dạng cho mọi thứ.
3. **CMS shell** (`CmsShell.tsx`) — ribbon trên cùng nền `slate-900` + sidebar trái liệt kê 5 phân
   hệ (SCR-09 → SCR-13, có badge số lượng chờ xử lý), nội dung chính là card trắng bo góc.

## Thành phần dùng chung (`src/components/ui`)

| Component                           | Vai trò                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `Button`                            | variants `gold`/`blue`/`dark`/`outline`/`danger`/`danger-ghost`/`ghost`            |
| `Input`/`Select`/`Textarea`/`Field` | field dùng chung, `rounded-xl border-slate-300`, focus ring brand-blue             |
| `Badge`                             | pill trạng thái (`neutral`/`positive`/`warning`/`critical`/`info`/`purple`/`gold`) |
| `Card` / `KpiCard`                  | khối bo góc trắng; `KpiCard` cho lưới chỉ số (label/value/hint)                    |
| `Table`/`Thead`/`Th`/`Tbody`/`Td`   | bảng phẳng, `whitespace-nowrap` + `overflow-x-auto` cho responsive                 |
| `Modal`                             | modal dùng chung (Nạp ví, Xem biên lai, JSON Diff)                                 |
| `CampaignTicketCard`                | thẻ Campaign dạng vé, `ctaLabel` tùy biến theo ngữ cảnh (công khai vs quản lý)     |

Không còn mô-típ "ledger-row" của v1 — wireframe mới không dùng, bảng dữ liệu dùng viền kẻ dòng
chuẩn (`divide-y divide-slate-100`) như mọi bảng admin khác.

## 13 màn hình — route thật tương ứng

| SRS    | Màn hình                            | Route                       |
| ------ | ----------------------------------- | --------------------------- |
| SCR-01 | Trang chủ & Public Campaigns        | `/`                         |
| SCR-02 | Đăng nhập / Đăng ký / Quên mật khẩu | `/login`, `/reset-password` |
| SCR-03 | Dashboard Bên A                     | `/a/dashboard`              |
| SCR-04 | Tạo Campaign & Survey Filter        | `/a/campaigns/new`          |
| SCR-05 | Quản lý Campaign & Duyệt Proof      | `/a/campaigns/[id]`         |
| SCR-06 | Dashboard Bên B                     | `/b/dashboard`              |
| SCR-07 | Làm Survey & Nộp Proof              | `/b/tasks/[id]`             |
| SCR-08 | Ví & Nạp/Rút KPoint                 | `/wallet`                   |
| SCR-09 | CMS Tổng quan & KPI                 | `/cms/overview`             |
| SCR-10 | CMS Duyệt nạp BMC quốc tế           | `/cms/payments`             |
| SCR-11 | CMS Dispute Center                  | `/cms/disputes`             |
| SCR-12 | CMS Phân quyền RBAC & Root Admin    | `/cms/rbac`                 |
| SCR-13 | CMS Audit Logs (kèm JSON Diff)      | `/cms/audit-logs`           |

`a/campaigns` (danh sách) là route phụ trợ ngoài 13 màn hình gốc, tái dùng `CampaignTicketCard`.

## Khác biệt có chủ đích so với wireframe gốc

Wireframe là một file HTML dev-tool có thanh điều hướng riêng (screen switcher, spec toggle,
responsive simulator, demo-fill) để BA/designer duyệt nhanh 13 màn hình — **không** đưa vào sản
phẩm thật. Những phần đó được thay bằng điều hướng thật cần thiết:

- Pill **Switch Mode (FN-AUTH-01)** và badge **số dư ví** — vốn nằm ở thanh dev-tool trong
  wireframe — được đưa vào `AppShell` thật vì đây là yêu cầu nghiệp vụ thật (SRS), không phải công
  cụ demo.
- Nút **"Tài khoản mẫu thử nghiệm (Quick Fill)"** ở màn Đăng nhập giữ lại (hữu ích cho giai đoạn
  pre-launch/demo), điền đúng 5 email đã seed (`root@`, `admin@`, `moderator@`, `advertiser@`,
  `publisher@kplatform.dev`) thay vì email giả trong wireframe.
- Nút OAuth Google/Facebook giữ nguyên hình thức nhưng **disabled** ("Sắp ra mắt") vì backend
  chưa có OAuth thật — wireframe mô phỏng đăng nhập giả, sản phẩm thật không được giả vờ thành
  công.
- Trang điều hướng nội bộ `/wireframes` (công cụ duyệt review cũ của v1) đã bị xoá — không còn
  cần thiết khi cả 13 route thật đã tồn tại.

## Việc còn lại trước Phase tiếp theo

- Vẫn là **wireframe fidelity**: dữ liệu từ `mock-data.ts`, phần lớn action (Approve/Reject,
  Invite, Lọc Audit Log...) chưa gọi API thật. Nối API theo đúng `TASK.md` từng Phase.
- `useCurrentUser`/`AppShell` đã đọc user thật qua `/auth/me` cho phần đăng nhập/switch-mode/đăng
  xuất — phần còn lại (campaigns, disputes, payments, audit logs, RBAC) vẫn là mock.
