<div align="center">

<img src="docs/assets/kplatform-logo.png" alt="K-Platform Logo" width="110"/>

# K-PLATFORM — THEO DÕI TIẾN ĐỘ TASK

![Based on](https://img.shields.io/badge/Dựa%20trên-PLAN.md-1d4e89?style=flat-square)
![Updated](https://img.shields.io/badge/Cập%20nhật-10%2F2026-2f6ca2?style=flat-square)

</div>

> File này breakdown từng task nhỏ từ [PLAN.md](PLAN.md) để theo dõi tiến độ hằng ngày/hằng sprint. Tick `[x]` khi hoàn thành, cập nhật bảng **Tiến độ tổng quan** theo đúng số liệu. Mỗi task có mã tham chiếu `FN-*`/`SCR-*` về [README.md](README.md)/[SRS_K-PLATFORM-v1.0.docx](SRS_K-PLATFORM-v1.0.docx) khi áp dụng.

**Chú thích trạng thái:** `[ ]` Chưa bắt đầu · `[~]` Đang làm (đổi thủ công, Markdown không tick được 1 nửa) · `[x]` Hoàn thành · `[!]` Bị chặn/Blocked

---

## Tiến độ tổng quan

| Phase    | Tên                              | Tổng task | Hoàn thành | %       | Trạng thái                                                                        |
| -------- | -------------------------------- | --------- | ---------- | ------- | --------------------------------------------------------------------------------- |
| 0        | Khởi tạo nền tảng                | 12        | 12         | 100%    | ✅ Xong (staging đã lên: health + DB OK)                                          |
| 1        | Auth, RBAC & Switch Mode         | 14        | 14         | 100%    | ✅ Xong (P1-04/05 ở mức mockup OAuth)                                             |
| 2        | Ví KPoint & SePay                | 13        | 13         | 100%    | ✅ Xong (P2-12: chủ dự án đã nạp thật qua SePay)                                  |
| 3        | Campaign & Survey                | 15        | 15         | 100%    | ✅ Xong                                                                           |
| 4        | Submission, Proof & Auto-Approve | 13        | 13         | 100%    | ✅ Xong                                                                           |
| 5        | Dispute Center                   | 12        | 12         | 100%    | ✅ Xong (P5-09 thông báo ở mức mock log, chưa có email thật)                      |
| 6        | Thanh toán Quốc tế & Audit Logs  | 15        | 14         | 93%     | 🔄 Còn P6-06 (email — chờ hạ tầng email thật)                                     |
| 7        | CMS Admin & RBAC nâng cao        | 11        | 11         | 100%    | ✅ Xong                                                                           |
| 8        | Hardening, QA & Go-live          | 14        | 3          | 21%     | 🔄 P8-03/04/05 xong; P8-01 có lỗ hổng cần sửa; P8-02 bị chặn (chưa có rate-limit) |
| 9        | Mobile App (React Native)        | 10        | 0          | 0%      | ⬜ Chưa bắt đầu                                                                   |
| **Tổng** |                                  | **129**   | **107**    | **83%** |

> Cập nhật dòng "Tổng task" nếu bạn chia nhỏ/gộp task bên dưới — con số phải luôn khớp với số checkbox thật của từng Phase.

---

## Mục lục

- [Phase 0 — Khởi tạo nền tảng](#phase-0--khởi-tạo-nền-tảng)
- [Phase 1 — Auth, RBAC & Switch Mode](#phase-1--auth-rbac--switch-mode)
- [Phase 2 — Ví KPoint & Thanh toán nội địa (SePay)](#phase-2--ví-kpoint--thanh-toán-nội-địa-sepay)
- [Phase 3 — Campaign & Survey](#phase-3--campaign--survey)
- [Phase 4 — Submission, Proof & Auto-Approve](#phase-4--submission-proof--auto-approve)
- [Phase 5 — Dispute Center](#phase-5--dispute-center)
- [Phase 6 — Thanh toán Quốc tế (BMC) & Audit Logs](#phase-6--thanh-toán-quốc-tế-bmc--audit-logs)
- [Phase 7 — CMS Admin & RBAC nâng cao](#phase-7--cms-admin--rbac-nâng-cao)
- [Phase 8 — Hardening, QA & Go-live](#phase-8--hardening-qa--go-live)
- [Phase 9 — Mobile App (React Native)](#phase-9--mobile-app-react-native)
- [Backlog việc còn mở (chưa gán Phase)](#backlog-việc-còn-mở-chưa-gán-phase)

---

## Phase 0 — Khởi tạo nền tảng

**Mục tiêu:** Repo chạy được end-to-end, CI xanh. _(DoD đầy đủ: xem PLAN.md § Phase 0)_

- [x] **P0-01** Khởi tạo monorepo (`frontend/`, `backend/`, `infra/`)
- [x] **P0-02** Cấu hình TypeScript dùng chung (tsconfig base) cho cả FE/BE
- [x] **P0-03** Cấu hình ESLint + Prettier + Husky pre-commit hook
- [x] **P0-04** Thiết kế schema CSDL PostgreSQL theo đúng ERD (SRS Section VII)
- [x] **P0-05** Cài migration tool (Prisma/TypeORM) + chạy migration khởi tạo
- [x] **P0-06** Viết seed data mẫu (user test cho từng role: Bên A, Bên B, Mod, Admin, Root Admin)
- [x] **P0-07** Dựng Docker Compose cho Dev (FE + BE + Postgres + Redis)
- [x] **P0-08** Tạo file `.env.example` liệt kê đầy đủ biến môi trường cần thiết
- [x] **P0-09** Thiết lập CI (GitHub Actions): lint + build + test chạy trên mỗi PR
- [x] **P0-10** Dựng môi trường Staging — _backend deploy qua GitHub Actions lên VPS (health `api-staging` OK, DB up), frontend Vercel. Lần deploy `develop → staging` (PR #66) thành công. Kiến trúc và hướng dẫn tại `DEPLOY.md`_
- [x] **P0-11** Thiết lập Design Token/UI Kit theo Branding (màu `#1d4e89`/`#e8a93a`, logo, typography)
- [x] **P0-12** Viết `CONTRIBUTING.md`/quy ước nhánh Git (tham chiếu PLAN.md § 9)

---

## Phase 1 — Auth, RBAC & Switch Mode

**Mục tiêu:** Đăng ký/đăng nhập, Switch Mode mượt không mất phiên, RBAC chặn đúng theo role.

- [x] **P1-01** Bảng `users` (+ cột `role` enum) + `roles_permissions` (migration + model)
- [x] **P1-02** Đăng ký/Đăng nhập bằng Email + Password _(SCR-02)_ — API thật + UI nối API, xem `screenshots/p1-login.png`, `p1-register.png`
- [x] **P1-03** Quên mật khẩu / reset password _(SCR-02)_ — chưa có SMTP thật, dùng mock mailer (log + dev token), xem `screenshots/p1-forgot-password.png`, `p1-reset-password*.png`
- [x] **P1-04** OAuth2 Google _(SCR-02)_ — **mockup**: nút UI "Sắp ra mắt" + endpoint `501 Not Implemented`; tích hợp OAuth thật để phase sau
- [x] **P1-05** OAuth2 Facebook _(SCR-02)_ — **mockup**, tương tự P1-04
- [x] **P1-06** Phát hành JWT (access 15m + refresh 7d)
- [x] **P1-07** API `POST /api/v1/auth/switch-mode` — đổi `active_mode`, giữ nguyên phiên (refresh token) _(FN-AUTH-01)_
- [x] **P1-08** Guard RBAC theo role (`JwtAuthGuard` + `RolesGuard`, enum `USER/MODERATOR/ADMIN/ROOT_ADMIN`)
- [x] **P1-09** Ràng buộc: Root Administrator hard-code ID (`ROOT_ADMIN_ID`), `RootAdminTargetGuard` chặn mọi API xóa/hạ cấp Root
- [x] **P1-10** Dashboard Bên A nối Auth/Switch Mode thật (header lấy từ `GET /auth/me`) _(SCR-03)_
- [x] **P1-11** Dashboard Bên B nối Auth/Switch Mode thật, cùng cơ chế _(SCR-06)_
- [x] **P1-12** Test case (e2e, pass): đăng nhập A → Switch B → gọi API khác không bị 401 — `backend/test/auth.e2e-spec.ts`
- [x] **P1-13** Test case (e2e, pass): xóa/hạ cấp Root Administrator qua API → bị chặn 403 — `backend/test/auth.e2e-spec.ts`
- [x] **P1-14** Demo cuối Phase — bằng chứng screenshot + e2e test tại README.md § X.1, chờ Product Owner duyệt chính thức

---

## Phase 2 — Ví KPoint & Thanh toán nội địa (SePay)

**Mục tiêu:** Nạp tiền qua SePay cộng KPoint tức thời, ví không bao giờ sai lệch khi đồng thời.

- [x] **P2-01** Bảng `wallets` (balance_kpoint, reserved_kpoint) — tự tạo khi user được tạo
- [x] **P2-02** Xin sandbox/test credentials từ SePay _(đã có Webhook API Key + tài khoản nhận tiền thật từ chủ dự án)_
- [x] **P2-03** Màn hình Quản lý Ví & Nạp/Rút KPoint _(SCR-08)_
- [x] **P2-04** Sinh mã QR VietQR nội dung `KLP_<topupCode>` _(FN-PAY-01 — đổi tiền tố KPOINT → KLP_ theo yêu cầu thực tế, mã ngắn 8 ký tự thay vì nhúng thẳng UserID để tránh bị ngân hàng cắt/biến dạng nội dung CK)_
- [x] **P2-05** API `POST /api/v1/payments/sepay-webhook` nhận webhook SePay
- [x] **P2-06** Idempotency theo `txn_id` — chống cộng tiền trùng khi webhook gọi lại
- [x] **P2-07** Transaction ACID (row lock `SELECT ... FOR UPDATE`) cho mọi thao tác cộng/trừ ví
- [x] **P2-08** UI lập lệnh rút tiền về ngân hàng, trạng thái `PENDING`
- [x] **P2-09** Lịch sử giao dịch ví — tách biệt theo chế độ Bên A/Bên B _(theo quy tắc Switch Mode ở SRS Section II)_
- [x] **P2-10** Test concurrency: 50 request cộng/trừ ví đồng thời không sai lệch số dư
- [x] **P2-11** Test webhook retry/duplicate không cộng tiền 2 lần
- [x] **P2-12** Test nạp tiền thật trên SePay sandbox end-to-end — _chủ dự án đã nộp tiền thành công qua SePay (webhook thật, cộng ví đúng). Trước đó đã verify pipeline bằng webhook giả lập đúng format SePay_
- [x] **P2-13** Demo cuối Phase — bằng chứng QA tại đây + e2e test `backend/test/payments.e2e-spec.ts` (18/18 pass)

---

## Phase 3 — Campaign & Survey

**Mục tiêu:** Bên A tạo Campaign thật, Bên B tìm và ứng tuyển, chống gian lận multi-account.

- [x] **P3-01** Bảng `campaigns` (migration + model)
- [x] **P3-02** Form Tạo Campaign & Survey Filter (Slots, Price, Drip-feed, câu hỏi sàng lọc) _(SCR-04)_
- [x] **P3-03** API `POST /api/v1/campaigns` — tính `Tổng KPoint = Phí tạo + (Slots × Price)` _(FN-CAMP-01)_
- [x] **P3-04** Khóa `reserved_kpoint` trong Wallet khi Campaign Active
- [x] **P3-05** Trang chủ & Public Campaigns — danh sách, tìm kiếm _(SCR-01)_
- [x] **P3-06** Bộ lọc nền tảng (Google Maps / Facebook) trên trang Public _(SCR-01)_
- [x] **P3-07** Hoàn thiện Dashboard Bên A với dữ liệu thật (thống kê Campaign, KPoint đã chi) _(SCR-03)_
- [x] **P3-08** Màn hình Quản lý Campaign & Appliers _(SCR-05)_
- [x] **P3-09** API `POST /api/v1/campaigns/:id/apply` — Ứng tuyển Survey _(FN-CAMP-02)_
- [x] **P3-10** Kiểm tra Device Fingerprint khi ứng tuyển
- [x] **P3-11** Kiểm tra IP + Trust Score khi ứng tuyển
- [x] **P3-12** Chức năng Invite/Reject ứng viên (Bên A) _(SCR-05)_
- [x] **P3-13** Quy tắc: Campaign cũ không thể xóa, chỉ Archive
- [x] **P3-14** Test: tạo Campaign khi không đủ số dư → bị chặn đúng thông báo
- [x] **P3-15** Test: 1 user tạo 2 tài khoản ứng tuyển cùng Campaign → bị chặn bởi Fingerprint/IP

---

## Phase 4 — Submission, Proof & Auto-Approve

**Mục tiêu:** Vòng đời ứng tuyển → review → nộp proof có watermark → duyệt (người hoặc tự động 48h).

- [x] **P4-01** Bảng `submissions` (migration + model, có `auto_approve_at`) — _đã có sẵn từ Phase 3 (apply/invite dùng chung bảng này); Phase 4 chỉ thêm 2 cột `review_url`/`review_note`_
- [x] **P4-02** Form Làm Survey & Submit Proof — upload ảnh/video _(SCR-07)_
- [x] **P4-03** API `POST /api/v1/submissions/:id/proof` (multipart) _(FN-TASK-01)_
- [x] **P4-04** Thiết lập Queue (BullMQ/Redis) xử lý watermark bất đồng bộ
- [x] **P4-05** Worker chèn Watermark UserID + CampaignID lên ảnh (sharp)
- [x] **P4-06** Worker chèn Watermark UserID + CampaignID lên video (ffmpeg drawtext)
- [x] **P4-07** UI trạng thái "đang xử lý" trong lúc chờ watermark hoàn tất (poll watermarkUrl)
- [x] **P4-08** Giới hạn: Bên B chỉ nhận tối đa 1 slot/campaign — _đã chặn từ Phase 3 (`@@unique([campaignId, publisherId])` + apply())_
- [x] **P4-09** Cronjob Auto-Approve 48h — quét `submissions` quá hạn _(FN-TASK-02)_
- [x] **P4-10** Luồng Bên A duyệt/từ chối Proof (nối từ SCR-05) — Approve trả thưởng ACID (ví Bên A → Bên B), Reject không đổi ví
- [x] **P4-11** Hoàn thiện Dashboard Bên B với dữ liệu thật (KPoint kiếm được, nhiệm vụ đang làm) _(SCR-06)_
- [x] **P4-12** Test watermark xuất hiện đúng trên ảnh + video mẫu — ảnh: `backend/test/submissions.e2e-spec.ts` (sharp thật, không mock); video: build Docker image thật + chạy ffmpeg drawtext trực tiếp trong container Alpine, xác nhận bằng mắt qua frame xuất ra (không có trong CI tự động vì phụ thuộc đường dẫn font của container)
- [x] **P4-13** Test cronjob chạy đúng giờ trên staging + không trả thưởng trùng khi chạy nhiều lần — `approve()` tự khoá row + re-check status trong transaction, test gọi lặp xác nhận lần 2 trả về `null` và ví không bị cộng 2 lần

---

## Phase 5 — Dispute Center

**Mục tiêu:** Luồng tranh chấp 3 vai trò (Bên B tạo → Moderator đề xuất → Admin phán quyết) không rò rỉ/nhân đôi KPoint.

- [x] **P5-01** Bảng `disputes` (migration + model) — _model/enum đã có sẵn từ Phase 0 (P0-04 ERD); Phase 5 chỉ thêm cột `reason` (migration riêng) + `submissions.reject_reason`_
- [x] **P5-02** API `POST /api/v1/disputes` — Tạo Khiếu nại khi Bên A từ chối Proof _(FN-DISP-01)_
- [x] **P5-03** Phong tỏa KPoint của slot liên quan khi Dispute mở — `DISPUTED` thêm vào `SLOT_OCCUPYING_STATUSES` (campaigns.service.ts), slot không mở lại cho ứng viên khác tới khi có phán quyết
- [x] **P5-04** Màn hình CMS Tranh chấp (Dispute Center) — xem bằng chứng 2 bên _(SCR-11)_
- [x] **P5-05** API `PUT /api/v1/mod/disputes/:id/recommend` _(FN-DISP-02)_
- [x] **P5-06** Guard: Moderator chỉ được `Pend Approval`/`Pend Reject`, không duyệt chi trực tiếp — route `/admin/disputes/:id/resolve` chỉ `@Roles(ADMIN, ROOT_ADMIN)`
- [x] **P5-07** API `POST /api/v1/admin/disputes/:id/resolve` _(FN-DISP-03)_
- [x] **P5-08** Giải phóng KPoint đúng bên thắng sau phán quyết Admin — tái dùng `SubmissionsService.approve()` (thắng Bên B) hoặc trả về `REJECTED` giữ nguyên ký quỹ Campaign (thắng Bên A), gộp 1 transaction ACID duy nhất với việc chốt `DisputeTicket`
- [x] **P5-09** Thông báo (email/app) cho Bên A & Bên B khi có cập nhật Dispute — **mock**: `Logger.log` ở mỗi mốc (tạo/đề xuất/phán quyết), giống mock mailer P1-03; chưa có hạ tầng email/push thật
- [x] **P5-10** Test nhánh "thắng Bên A" — giải phóng đúng số KPoint, không rò rỉ — `backend/test/disputes.e2e-spec.ts`
- [x] **P5-11** Test nhánh "thắng Bên B" — giải phóng đúng số KPoint, không rò rỉ — `backend/test/disputes.e2e-spec.ts`
- [x] **P5-12** Test RBAC: Moderator không gọi được trực tiếp API phán quyết cuối — `backend/test/disputes.e2e-spec.ts`

---

## Phase 6 — Thanh toán Quốc tế (BMC) & Audit Logs

**Mục tiêu:** Admin duyệt nạp quốc tế thủ công an toàn; mọi thao tác nhạy cảm đều truy vết được.

- [x] **P6-01** Bảng `bmc_topups` (migration + model) — `20261004150804_p6_enum_values` + `20261004150805_p6_international_payment`, kèm bảng `international_packages`
- [x] **P6-02** Form nạp Buy Me a Coffee — tab "International Payment" (EN chính, VI phụ) trong modal Nạp KPoint: chọn gói → nhận mã `KPL-XXXXXXXX` do hệ thống sinh (user dán vào lời nhắn BMC) → mở link BMC → upload biên lai _(FN-PAY-02; không còn nhập Transaction ID tay)_
- [x] **P6-03** API nạp BMC — `POST /payments/bmc/topups` (tạo `AWAITING_PAYMENT`, snapshot tỷ giá + gói), `POST /payments/bmc/topups/:id/receipt` (→ `PENDING_MANUAL_VERIFICATION`)
- [x] **P6-04** Màn hình CMS "Đối soát nạp tiền" (`/cms/payments`, SCR-10) — gộp nạp SePay + BMC, lọc nguồn/trạng thái, xem biên lai, Duyệt/Từ chối (bắt buộc lý do), đánh dấu quá hạn theo B-04 _(thay thế bản mock cũ)_
- [x] **P6-05** Duyệt BMC — `PATCH /admin/bmc/topups/:id/decision` ACID: khoá row giao dịch + ví, cộng KPoint theo tỷ giá snapshot, ghi ledger `TOPUP_BMC` + audit log trong cùng transaction _(FN-PAY-03)_
- [ ] **P6-06** Gửi email xác nhận khi Approve; thông báo hủy khi Reject — _chưa làm: hạ tầng email thật chưa có (xem P5-09/P1-03), lý do từ chối đang hiển thị trong lịch sử nạp của user_
- [x] **P6-07** Bảng `audit_logs` (migration + model, JSON Diff before/after) — đã có từ Phase 7; luồng duyệt BMC và CRUD gói ghi trực tiếp vào bảng này
- [x] **P6-08** Interceptor NestJS ghi Audit Log cho mọi Mutation (CREATE/UPDATE/DELETE/DISPUTE_RESOLVE/MANUAL_TOPUP) _(FN-LOG-01)_
- [x] **P6-09** Ghi kèm IP Address + Device Fingerprint vào mỗi Audit Log
- [x] **P6-10** Màn hình CMS Quản lý Audit Logs — bộ lọc (thời gian/User/Role/Action/Level) _(SCR-13)_
- [x] **P6-11** Bảng hiển thị Nhật ký + popup Log Detail (JSON viewer) _(SCR-13)_
- [x] **P6-12** Đánh dấu đỏ hành vi `CRITICAL` (hạ cấp Admin, sửa số dư thủ công, duyệt dispute lớn, IP lạ)
- [x] **P6-13** API `GET /api/v1/admin/audit-logs` (phân trang, filter)
- [x] **P6-14** Test: 100% hành động trong danh sách CRITICAL đều xuất hiện đúng định dạng trong Audit Log
- [x] **P6-15** Rà soát không còn "backdoor endpoint" nào bỏ qua ghi log

---

## Phase 7 — CMS Admin & RBAC nâng cao

**Mục tiêu:** Admin/Root Admin vận hành toàn bộ hệ thống qua CMS, không cần đụng DB trực tiếp.

- [x] **P7-01** Màn hình CMS Overview & Thống kê _(SCR-09)_ — real data qua `GET /admin/reports/kpi-overview`, mở cho Admin/Mod
- [x] **P7-02** Thống kê KPoint lưu thông — `SUM(balance_kpoint)` toàn hệ thống
- [x] **P7-03** Thống kê số lượt review/ngày — suy ra từ `auto_approve_at - 48h` (thời điểm nộp Proof thật), không cần thêm cột mới
- [x] **P7-04** Thống kê doanh thu phí khởi tạo Campaign — tái dùng `ReportsService` (issue #55), tháng hiện tại
- [x] **P7-05** Màn hình CMS Quản lý RBAC & Root Admin _(SCR-12)_ — danh sách nhân sự thật, đổi role, xóa user, tìm email để phong Moderator
- [x] **P7-06** Chức năng tạo role + gán permission — CRUD bảng `RolePermission` (có sẵn từ P0-04, chưa dùng tới) làm tài liệu tham khảo, không dùng để enforce
- [x] **P7-07** Chức năng gán quyền Admin/Moderator — `PATCH /admin/users/:id/role`
- [x] **P7-08** Chức năng phân công Campaign cho Moderator cụ thể — `Campaign.assignedModeratorId` (migration mới) + CMS dropdown, enforce ở Dispute recommend
- [x] **P7-09** Hoàn thiện Admin duyệt lệnh rút tiền về ngân hàng (nối từ Phase 2) — đã làm ở nhánh ad-hoc trước Phase 5 (`/cms/withdrawals`, `admin-withdrawals.controller.ts`)
- [x] **P7-10** Rà soát & hoàn thiện toàn bộ ràng buộc RBAC còn lại theo bảng Section II SRS — phát hiện + vá 2 lỗ hổng: (1) Admin thường có thể tự phong/hạ cấp Admin khác (giờ chỉ Root Admin), (2) "Super/Moderator: Quản lý Campaign được phân công" chưa từng được enforce (giờ Moderator không được phân công bị chặn đề xuất Dispute của Campaign đó)
- [x] **P7-11** Test: Root Administrator tạo/xóa Admin khác → hành động được Audit Log ghi đầy đủ — ghi trực tiếp từ `UsersService` (interceptor tổng quát bắt MỌI Mutation vẫn thuộc Phase 6/FN-LOG-01), test tại `backend/test/rbac-admin.e2e-spec.ts`

---

## Phase 8 — Hardening, QA & Go-live

**Mục tiêu:** Hệ thống sẵn sàng vận hành thật, có giám sát 48h đầu sau go-live.

- [x] **P8-01** Kiểm thử OWASP Top 10 cơ bản (injection, IDOR giữa các role) — _`backend/scripts/security/owasp-probe.mjs`: 36/36 PASS sau khi sửa. Đã sửa: (1) upload giả mạo (avatar, proof, biên lai BMC) — đuôi file lấy từ MIME đã whitelist, kiểm tra nội dung thật (sharp / `%PDF-`), chặn stored XSS; (2) header bảo mật (nosniff, X-Frame-Options, CSP, HSTS, Referrer-Policy) và bỏ `X-Powered-By`; `/uploads` có CSP sandbox. Regression: `test/security-hardening.e2e-spec.ts`._
- [x] **P8-02** Kiểm thử rate-limit cho luồng Auth — _Đã thêm rate-limit Redis (fail-open khi Redis lỗi): đăng nhập 20 lần/10 phút theo cặp IP+email; đăng ký 30/giờ/IP; quên mật khẩu 5/giờ theo IP+email; đặt lại mật khẩu 30/giờ/IP. Kiểm thử: 150 lần sai đồng thời → 130 bị 429, 0 lỗi kết nối._
- [x] **P8-03** Kiểm thử tải luồng Nạp tiền (mục tiêu p95 < 500ms) — _`backend/scripts/load/load-test.mjs deposit`: 400 webhook @ 25 đồng thời: p95 208ms, 0 lỗi, cộng đúng, replay không cộng lại. Ghi chú: 2.000 @ 100 đồng thời vào **cùng một ví** → p95 555ms (tranh chấp khoá hàng ví), vẫn đúng số dư. Kiểm lại với nhiều ví và trên VPS thật._
- [x] **P8-04** Kiểm thử tải luồng Rút tiền — _60 lệnh tạo @ 20 đồng thời (p95 45ms) + 60 Admin duyệt (p95 61ms), duyệt lần 2 bị chặn, số dư và khoá reserved đúng._
- [x] **P8-05** Kiểm thử tải luồng Dispute — _20 khiếu nại (p95 19ms, chặn trùng khiếu nại đồng thời), 20 đề xuất (p95 23ms), 20 phán quyết (p95 162ms); không còn khiếu nại mở sau phán quyết._
- [ ] **P8-06** Viết runbook: xử lý webhook SePay lỗi
- [ ] **P8-07** Viết runbook: xử lý cronjob Auto-Approve fail
- [ ] **P8-08** Viết runbook: rollback migration CSDL
- [ ] **P8-09** Soạn checklist UAT bám theo từng SCR/FN trong SRS
- [ ] **P8-10** Thực hiện UAT cùng Product Owner
- [ ] **P8-11** Thiết lập monitoring/alerting (uptime, lỗi 5xx, queue backlog, cronjob miss)
- [ ] **P8-12** Soạn kịch bản go-live + rollback plan
- [ ] **P8-13** Go-live
- [ ] **P8-14** Trực giám sát 48h đầu sau go-live

---

## Phase 9 — Mobile App (React Native)

> Chỉ bắt đầu sau khi Web Phase 1 ổn định ≥ 4 tuần. Danh sách dưới là sơ bộ — cần lập kế hoạch sprint chi tiết riêng khi tới thời điểm.

- [ ] **P9-01** Setup project React Native (Expo)
- [ ] **P9-02** Thiết kế lại UI/UX cho mobile (tái sử dụng API hiện có)
- [ ] **P9-03** Màn hình Đăng nhập/Đăng ký mobile (tái dùng API Phase 1)
- [ ] **P9-04** Đăng nhập sinh trắc học (Face ID/Touch ID)
- [ ] **P9-05** Push notification: Invite ứng tuyển
- [ ] **P9-06** Push notification: Duyệt/Từ chối Proof
- [ ] **P9-07** Push notification: Kết quả Dispute
- [ ] **P9-08** Upload ảnh/video Proof có nén trước khi gửi (tối ưu băng thông mobile)
- [ ] **P9-09** Phát hành thử nghiệm nội bộ (TestFlight / Internal Testing track)
- [ ] **P9-10** Thu thập feedback nội bộ & lên kế hoạch release chính thức

---

## Backlog việc còn mở (chưa gán Phase)

> Tham chiếu PLAN.md § 11 — cần quyết định/bổ sung trước khi các Phase liên quan có thể hoàn thành 100%.

- [x] **B-01** Thiết kế Wireframe/UI chi tiết — làm bằng Next.js/Tailwind thật (không phải Figma) tại `frontend/src/app/`, xem `/wireframes` + `frontend/DESIGN.md`. Cần Product Owner duyệt trước khi chuyển sang code production ở Phase 1.
- [x] **B-02** Chốt chính sách version hóa tỷ giá KPoint ↔ VNĐ ↔ USD theo thời gian — giữ 1 KPoint = 1 VNĐ cố định; thêm CMS "Cài đặt thanh toán" tab "Quốc Tế (BMC)" (chuẩn bị trước cho Phase 6): tỷ giá USD→VNĐ mặc định 26.300, lưu lịch sử append-only (`exchange_rate_history`, không ghi đè dòng cũ) để tra theo thời điểm nạp + thống kê sau này; thời gian đối soát Admin mặc định 7 ngày, cũng cấu hình được.
- [x] **B-03** Chốt SLA xử lý Dispute — mặc định Moderator đề xuất trong 12h đầu (Admin cũng xử lý được trong khung này), Admin chốt phán quyết cuối trong 24h đầu; cấu hình qua Modal "Cài Đặt SLA" ngay trong CMS Dispute Center (chỉ Admin/Root Admin thấy + chỉnh). Quá hạn Moderator → Admin được phán quyết thẳng, bỏ qua bước chờ đề xuất (leo thang).
- [x] **B-04** Chốt SLA duyệt Nạp Quốc tế — mặc định Admin đối soát trong 7 ngày (~1 tuần), cấu hình tại CMS "Cài đặt thanh toán" tab Quốc Tế (dùng chung hạ tầng với B-02, chuẩn bị trước cho Phase 6 BMC).
- [x] **B-05** Chốt ngưỡng Trust Score & quy tắc khóa tài khoản gian lận — hệ thống `TrustScoreRule` (CRUD đầy đủ ở backend `admin/trust-score/rules`) + sổ cái `TrustScoreTransaction`. 5 rule mặc định: thua Dispute -10, Proof bị từ chối -5, hoàn thành 3/5 Proof trong tuần +5/+10 (cron hằng tuần), đăng nhập liên tục 7 ngày +5 (tính lúc login). Admin +/- điểm tay cho bất kỳ tài khoản nào (trừ Root). Không giới hạn trần 100 — có bảng Top 10 Trust Score ở CMS Thống Kê Doanh Thu. "Khóa tài khoản gian lận" dùng chung cơ chế vô hiệu hoá của CMS Quản Trị Tài Khoản (xem mục mới bên dưới) — Admin tự quyết định ngưỡng, không enforce cứng trong code.
  > ✅ **Đã bổ sung** (`/cms/settings/trust-score`): Admin tạo/sửa/bật-tắt/xoá lý do tự tạo. Ghi chú gap cũ giữ để lịch sử: CMS **chưa có màn hình** cho Admin tự tạo/sửa/xóa rule mới — `createTrustScoreRule`/`updateTrustScoreRule`/`deleteTrustScoreRule` (`frontend/src/lib/trust-score-client.ts`) có sẵn nhưng không nơi nào trong UI gọi tới; `/cms/accounts` chỉ `listTrustScoreRules()` để hiển thị dropdown lúc +/- điểm tay. Cần bổ sung UI quản lý rule (hoặc xác nhận tạm thời chưa cần) trước khi coi yêu cầu "Admin tự tạo thêm lý do" là xong 100%.
- [x] **B-06** Đối chiếu lại Ma trận FN/SCR (PLAN.md § 6) mỗi khi SRS được bổ sung — chưa có file `SRS_K-PLATFORM-v1.0.docx` bản mới, nhưng các quyết định nghiệp vụ khi xử lý B-02/03/04/05 (xem các mục trên) là một bản bổ sung yêu cầu trên thực tế, nên đã đối chiếu theo đó: thêm **SCR-14** (CMS Quản Trị Tài Khoản), **SCR-15** (CMS Cài đặt thanh toán), **FN-TRUST-01** (Trust Score), **FN-DISP-04** (SLA & leo thang Dispute), **FN-PAY-04** (cấu hình tỷ giá & SLA Thanh toán Quốc tế) vào README.md §IV/V + PLAN.md §6; sửa lại mô tả sai ở README §I.1 (tỷ giá KPoint↔VNĐ là **cố định** 1:1, không phải "linh hoạt" như bản cũ ghi nhầm — chỉ tỷ giá USD→VNĐ mới cấu hình được). Việc này vẫn định kỳ — đối chiếu lại lần tới khi có SRS bản mới hoặc backlog tiếp theo.

### Màn hình quản trị CMS — mã màn hình & phân quyền

Mã `SCR-xx` theo SRS (README §IV). SCR-01 → SCR-15 đã được định nghĩa; màn hình mới đánh tiếp từ SCR-16. Mỗi màn hình phải có quyền riêng ở API (`@RequirePermission`) và kiểm tra quyền ở UI.

| Mã     | Màn hình                                                             | Route                                                   | Tài nguyên & hành động                                                                           | Trạng thái                   |
| ------ | -------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- |
| SCR-09 | Tổng quan KPI                                                        | `/cms/overview`                                         | `dashboard_overview`: READ                                                                       | Đã có                        |
| SCR-10 | Đối soát nạp tiền (SePay + BMC)                                      | `/cms/payments`                                         | `payments_reconciliation`: READ, APPROVE                                                         | Đã có                        |
| SCR-11 | Dispute Center                                                       | `/cms/disputes`                                         | `disputes`: READ, UPDATE, APPROVE                                                                | Đã có                        |
| SCR-12 | Phân quyền & nhóm quyền                                              | `/cms/rbac`                                             | `rbac`: READ, CREATE, UPDATE, DELETE                                                             | Đã có                        |
| SCR-13 | Nhật ký Audit Logs                                                   | `/cms/audit-logs`                                       | `audit_logs`: READ                                                                               | Đã có                        |
| SCR-14 | Quản trị tài khoản                                                   | `/cms/accounts`                                         | `accounts`: READ, CREATE, UPDATE, DELETE                                                         | Đã có                        |
| SCR-15 | Cài đặt thanh toán (SePay, thanh toán quốc tế, gói BMC)              | `/cms/settings/payments`, `/cms/settings/international` | `settings`: READ, UPDATE; `international_packages`: READ, CREATE, UPDATE, DELETE                 | Đã có                        |
| SCR-16 | Quản trị Campaign (xem, phân công Moderator)                         | `/cms/campaigns`                                        | `campaigns`: READ, UPDATE                                                                        | Đã có (phân công)            |
| SCR-17 | Thống kê doanh thu & bảng xếp hạng Trust Score                       | `/cms/reports`                                          | `reports`: READ                                                                                  | Đã có (chưa có mã trong SRS) |
| SCR-18 | Yêu cầu rút tiền                                                     | `/cms/withdrawals`                                      | `withdrawals`: READ, APPROVE                                                                     | Đã có (chưa có mã trong SRS) |
| SCR-19 | Cài đặt phí kích hoạt dịch vụ                                        | `/cms/settings/activation-fee`                          | `settings`: READ, UPDATE                                                                         | Đã có (chưa có mã trong SRS) |
| SCR-20 | Lý do Trust Score (rule cộng/trừ điểm)                               | `/cms/settings/trust-score`                             | `trust_score`: READ, CREATE, UPDATE, DELETE                                                      | Đã có (chưa có mã trong SRS) |
| SCR-21 | Chi tiết & xử lý Campaign (sửa, vô hiệu hoá, lưu trữ)                | `/cms/campaigns/[id]`                                   | `campaigns`: READ, UPDATE, DELETE (DELETE = lưu trữ, không xoá cứng; hoàn ký quỹ slot chưa dùng) | Chưa làm                     |
| SCR-22 | Quản trị Proof (duyệt/từ chối thủ công, watermark kẹt)               | `/cms/submissions`                                      | `submissions`: READ, UPDATE, APPROVE                                                             | Chưa làm                     |
| SCR-23 | Ví & sổ cái người dùng (điều chỉnh số dư có lý do)                   | `/cms/wallets`                                          | `wallets`: READ, UPDATE, APPROVE                                                                 | Chưa làm                     |
| SCR-24 | Chống gian lận (trùng fingerprint/IP, đánh dấu/khoá)                 | `/cms/fraud`                                            | `fraud`: READ, UPDATE                                                                            | Chưa làm                     |
| SCR-25 | Giám sát vận hành (hàng đợi, cronjob, webhook lỗi, thử lại job)      | `/cms/ops`                                              | `system_ops`: READ, UPDATE                                                                       | Chưa làm                     |
| SCR-26 | Xuất báo cáo (CSV đối soát, doanh thu, KPI)                          | `/cms/reports` (nút xuất)                               | `reports`: READ, CREATE                                                                          | Chưa làm                     |
| SCR-27 | Cấu hình nền tảng (phí/giới hạn Campaign, thưởng tối thiểu, số slot) | `/cms/settings/platform`                                | `settings`: READ, UPDATE                                                                         | Chưa làm                     |
| SCR-28 | Nội dung CMS (banner, FAQ, điều khoản công khai)                     | `/cms/content`                                          | `content`: READ, CREATE, UPDATE, DELETE                                                          | Chưa làm                     |
| SCR-29 | Mẫu thông báo / email (chờ hạ tầng mail)                             | `/cms/notifications`                                    | `notifications`: READ, UPDATE                                                                    | Chưa làm                     |
| SCR-30 | Phiên đăng nhập (buộc đăng xuất người dùng)                          | `/cms/sessions`                                         | `accounts`: UPDATE (cần thu hồi refresh token)                                                   | Chưa làm                     |

Quyết định đã chốt:

- **Xoá Campaign:** trong CMS, "xoá" nghĩa là **lưu trữ (archive)**, không xoá cứng (theo P3-13). Khi lưu trữ, hoàn ký quỹ các slot chưa dùng.

Việc còn lại:

- Thêm test đảm bảo mọi route `/admin/*` đều khai báo `@RequirePermission`, để không có route nào thiếu phân quyền.
- Cập nhật README §IV (SRS) với các mã SCR-16 → SCR-30 khi làm bản bổ sung tiếp theo (B-06).

### Kết quả kiểm thử toàn bộ — 2026-10-05 (nhánh RBAC + QA, trước khi merge vào develop)

- **Backend e2e:** 114/114 pass (19 file), gồm bảo mật (`security-hardening`), RBAC (`rbac`), hồ sơ/đăng ký (`profile`), audit log.
- **Lint / typecheck / build:** backend và frontend sạch (không lỗi; warning đã xử lý); `nest build` và `next build` (27 route) thành công.
- **OWASP probe (`scripts/security/owasp-probe.mjs`):** 36/36 PASS.
- **Tải (`scripts/load/load-test.mjs`, môi trường test local — không phản ánh VPS):**
  - Nạp tiền: 400 webhook @25 đồng thời → p95 237 ms, 0 lỗi, cộng đúng, replay không cộng lại.
  - Rút tiền: 60 lệnh tạo (p95 62 ms) + 60 duyệt (p95 69 ms), duyệt lần 2 bị chặn, không sai lệch số dư.
  - Khiếu nại: 20 tạo (p95 27 ms), 20 đề xuất (p95 29 ms), 20 phán quyết (p95 163 ms), không còn khiếu nại mở.
- **Lưu ý:** script tải và probe yêu cầu biến môi trường (`QA_PASS`, `SEPAY_WEBHOOK_API_KEY`) — không có mật khẩu cố định trong repo. Rate-limit đăng nhập có thể làm kịch bản bị 429 nếu chạy lại trong 10 phút; xoá bộ đếm Redis giữa các lần chạy.
- **Chưa kiểm:** tải nhiều ví (đề xuất kiểm lại trên VPS); HSTS thực tế qua nginx staging; giao diện RBAC với người dùng thật.

### Phase 6 — Audit Logs (ghi chú triển khai)

- Interceptor toàn cục ghi mọi mutation HTTP (POST/PUT/PATCH/DELETE). Request bị từ chối, kể cả 401/403 từ guard, do `AuditExceptionFilter` ghi. Service nào ghi chi tiết thì dùng `AuditService.write` và không bị ghi trùng.
- Credential (password, token, api key, secret) được redact trước khi ghi. Đăng nhập thành công ghi `LOGIN`; đăng nhập từ IP lạ sau khi đã có lịch sử thì `CRITICAL`.
- Mức CRITICAL: Trust Score điều chỉnh tay, duyệt/từ chối dispute, duyệt rút tiền, duyệt nạp BMC, đăng nhập IP lạ, hạ cấp/xoá Admin (có sẵn).
- P6-15 (rà soát backdoor): không có route mutation nào bị đánh dấu `skip`. Mọi route đi qua interceptor toàn cục. E2E `audit-logs.e2e-spec.ts` kiểm tra đại diện các nhóm: CRITICAL, login, webhook, request bị 403, và credential không bị lưu.

### Ad-hoc — Phân quyền theo nhóm, hồ sơ & đăng ký (yêu cầu mới)

- [x] **Phân quyền lại toàn bộ (SCR-12):** danh mục chức năng × hành động (Xem / Tạo / Sửa / Xoá / Duyệt) trong `backend/src/rbac/permission-catalog.ts`. Nhóm quyền tự tạo (vd. Supermoderator); 2 nhóm hệ thống gắn role (Quản trị viên, Moderator) không xoá được. Quyền riêng từng user ALLOW/DENY ưu tiên hơn nhóm. Root luôn toàn quyền. Mọi route CMS dùng `@RequirePermission`.
- [x] Phân công Campaign cho moderator bắt buộc moderator đó có quyền "Quản trị Campaign" (Sửa); thiếu quyền thì báo lỗi yêu cầu quản trị viên cấp quyền.
- [x] Hạ role về USER thì xoá hết nhóm và quyền riêng. Xoá Quản trị viên vẫn chỉ Root được.
- [x] Menu CMS và nút hành động ẩn/hiện theo quyền thật (`/admin/rbac/me`); backend vẫn kiểm tra mọi request.
- [x] Đăng ký: xác nhận mật khẩu, họ tên, SĐT, ngày sinh (≥ 16 tuổi), giới tính, tỉnh/thành, nghề nghiệp (không bắt buộc).
- [x] Hồ sơ `/profile`: ảnh đại diện, họ tên, SĐT, ngày sinh, giới tính, tỉnh/thành, nghề nghiệp, bio. Email không đổi được.
- [x] Trang công khai nhận biết đã đăng nhập (không bắt đăng nhập lại khi bấm "Khám phá Campaign").
- [x] Layout CMS full-width, giữ nguyên cột trái.

### Ad-hoc — Thanh toán quốc tế BMC (theo yêu cầu chủ dự án)

- [x] Modal Nạp KPoint: đổi tên tab "Buy Me a Coffee (USD)" → **International Payment** (nội dung EN chính, VI phụ). Mã đối soát `KPL-` do hệ thống sinh, không nhập tay.
- [x] 3 gói mặc định ($10/$20/$50, link BMC do chủ dự án tạo sẵn) seed một lần khi bảng rỗng; Admin thêm/sửa/tắt/xoá gói tại CMS.
- [x] CMS menu con **Cài Đặt > Thanh toán quốc tế** (`/cms/settings/international`): tỷ giá USD→VNĐ + thời gian đối soát (chuyển từ tab "Quốc Tế" cũ) + quản lý gói nạp. Trang **Cài đặt SePay** giữ riêng phần SePay.
- [x] Đối soát tất cả giao dịch nạp (SePay + BMC) tại `/cms/payments`.

### Ad-hoc — CMS Quản Trị Tài Khoản (yêu cầu mới, chưa có mã task gốc)

- [x] Màn hình `/cms/accounts` — CRUD đầy đủ mọi tài khoản (tạo/sửa email+mật khẩu/đổi role/xóa), kích hoạt/vô hiệu hoá (`users.disabled_at`, chặn đăng nhập khi vô hiệu hoá). Chỉ Admin/Root Admin truy cập.
- [x] Bảo vệ Root Administrator nâng cao — **chỉ chính Root mới tự sửa được hồ sơ của mình** (email/mật khẩu, `RootAdminSelfOnlyGuard`); **không ai** (kể cả chính Root) vô hiệu hoá/xóa/đổi role được Root qua API (`RootAdminTargetGuard`, giữ nguyên từ P1-09).
- [x] Rà soát hardening RBAC đi kèm: chỉ Root tạo được tài khoản role ADMIN (Admin thường chỉ tạo USER/MODERATOR).

---

<div align="center">
<sub>© 2026 K-Platform — Cập nhật file này mỗi khi hoàn thành task hoặc khi PLAN.md/SRS thay đổi.</sub>
</div>
