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

| Phase    | Tên                              | Tổng task | Hoàn thành | %      | Trạng thái                           |
| -------- | -------------------------------- | --------- | ---------- | ------ | ------------------------------------ |
| 0        | Khởi tạo nền tảng                | 12        | 11         | 92%    | 🔄 Gần xong (P0-10 cần hạ tầng thật) |
| 1        | Auth, RBAC & Switch Mode         | 14        | 0          | 0%     | ⬜ Chưa bắt đầu                      |
| 2        | Ví KPoint & SePay                | 13        | 0          | 0%     | ⬜ Chưa bắt đầu                      |
| 3        | Campaign & Survey                | 15        | 0          | 0%     | ⬜ Chưa bắt đầu                      |
| 4        | Submission, Proof & Auto-Approve | 13        | 0          | 0%     | ⬜ Chưa bắt đầu                      |
| 5        | Dispute Center                   | 12        | 0          | 0%     | ⬜ Chưa bắt đầu                      |
| 6        | Thanh toán Quốc tế & Audit Logs  | 15        | 0          | 0%     | ⬜ Chưa bắt đầu                      |
| 7        | CMS Admin & RBAC nâng cao        | 11        | 0          | 0%     | ⬜ Chưa bắt đầu                      |
| 8        | Hardening, QA & Go-live          | 14        | 0          | 0%     | ⬜ Chưa bắt đầu                      |
| 9        | Mobile App (React Native)        | 10        | 0          | 0%     | ⬜ Chưa bắt đầu                      |
| **Tổng** |                                  | **129**   | **11**     | **9%** |                                      |

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
- [~] **P0-10** Dựng môi trường Staging — _kiến trúc đã chốt (Backend: Docker trên VPS aaPanel; Frontend: Vercel), workflow deploy + hướng dẫn từng bước đầy đủ tại `DEPLOY.md`; còn chờ thực hiện trên VPS/Vercel/GitHub Secrets thật (việc của bạn, ngoài phạm vi code)_
- [x] **P0-11** Thiết lập Design Token/UI Kit theo Branding (màu `#1d4e89`/`#e8a93a`, logo, typography)
- [x] **P0-12** Viết `CONTRIBUTING.md`/quy ước nhánh Git (tham chiếu PLAN.md § 9)

---

## Phase 1 — Auth, RBAC & Switch Mode

**Mục tiêu:** Đăng ký/đăng nhập, Switch Mode mượt không mất phiên, RBAC chặn đúng theo role.

- [ ] **P1-01** Bảng `users` + `roles_permissions` (migration + model)
- [ ] **P1-02** Đăng ký/Đăng nhập bằng Email + Password _(SCR-02)_
- [ ] **P1-03** Quên mật khẩu / reset password qua email _(SCR-02)_
- [ ] **P1-04** OAuth2 Google _(SCR-02)_
- [ ] **P1-05** OAuth2 Facebook _(SCR-02)_
- [ ] **P1-06** Phát hành JWT (access + refresh token)
- [ ] **P1-07** API `POST /api/v1/auth/switch-mode` — đổi `active_mode`, giữ nguyên JWT _(FN-AUTH-01)_
- [ ] **P1-08** Guard RBAC theo role (Bên A/Bên B/Super-Moderator/Administrator/Root Administrator)
- [ ] **P1-09** Ràng buộc: Root Administrator hard-code ID, chặn mọi API xóa/hạ cấp Root
- [ ] **P1-10** Khung Dashboard Bên A rỗng (chưa data) để test UI Switch Mode _(SCR-03)_
- [ ] **P1-11** Khung Dashboard Bên B rỗng (chưa data) để test UI Switch Mode _(SCR-06)_
- [ ] **P1-12** Test case: đăng nhập A → Switch B → gọi API bất kỳ không bị 401
- [ ] **P1-13** Test case: thử xóa/hạ cấp Root Administrator qua mọi endpoint → bị chặn 403/409
- [ ] **P1-14** Demo cuối Phase cho Product Owner + đối chiếu DoD

---

## Phase 2 — Ví KPoint & Thanh toán nội địa (SePay)

**Mục tiêu:** Nạp tiền qua SePay cộng KPoint tức thời, ví không bao giờ sai lệch khi đồng thời.

- [ ] **P2-01** Bảng `wallets` (balance_kpoint, reserved_kpoint) — tự tạo khi user được tạo
- [ ] **P2-02** Xin sandbox/test credentials từ SePay _(ưu tiên cao — xem Rủi ro R1 trong PLAN.md)_
- [ ] **P2-03** Màn hình Quản lý Ví & Nạp/Rút KPoint _(SCR-08)_
- [ ] **P2-04** Sinh mã QR VietQR nội dung `KPOINT <UserID>` _(FN-PAY-01)_
- [ ] **P2-05** API `POST /api/v1/payments/sepay-webhook` nhận webhook SePay
- [ ] **P2-06** Idempotency theo `txn_id` — chống cộng tiền trùng khi webhook gọi lại
- [ ] **P2-07** Transaction ACID (row lock `SELECT ... FOR UPDATE`) cho mọi thao tác cộng/trừ ví
- [ ] **P2-08** UI lập lệnh rút tiền về ngân hàng, trạng thái `PENDING`
- [ ] **P2-09** Lịch sử giao dịch ví — tách biệt theo chế độ Bên A/Bên B _(theo quy tắc Switch Mode ở SRS Section II)_
- [ ] **P2-10** Test concurrency: 50 request cộng/trừ ví đồng thời không sai lệch số dư
- [ ] **P2-11** Test webhook retry/duplicate không cộng tiền 2 lần
- [ ] **P2-12** Test nạp tiền thật trên SePay sandbox end-to-end
- [ ] **P2-13** Demo cuối Phase cho Product Owner + đối chiếu DoD

---

## Phase 3 — Campaign & Survey

**Mục tiêu:** Bên A tạo Campaign thật, Bên B tìm và ứng tuyển, chống gian lận multi-account.

- [ ] **P3-01** Bảng `campaigns` (migration + model)
- [ ] **P3-02** Form Tạo Campaign & Survey Filter (Slots, Price, Drip-feed, câu hỏi sàng lọc) _(SCR-04)_
- [ ] **P3-03** API `POST /api/v1/campaigns` — tính `Tổng KPoint = Phí tạo + (Slots × Price)` _(FN-CAMP-01)_
- [ ] **P3-04** Khóa `reserved_kpoint` trong Wallet khi Campaign Active
- [ ] **P3-05** Trang chủ & Public Campaigns — danh sách, tìm kiếm _(SCR-01)_
- [ ] **P3-06** Bộ lọc nền tảng (Google Maps / Facebook) trên trang Public _(SCR-01)_
- [ ] **P3-07** Hoàn thiện Dashboard Bên A với dữ liệu thật (thống kê Campaign, KPoint đã chi) _(SCR-03)_
- [ ] **P3-08** Màn hình Quản lý Campaign & Appliers _(SCR-05)_
- [ ] **P3-09** API `POST /api/v1/campaigns/:id/apply` — Ứng tuyển Survey _(FN-CAMP-02)_
- [ ] **P3-10** Kiểm tra Device Fingerprint khi ứng tuyển
- [ ] **P3-11** Kiểm tra IP + Trust Score khi ứng tuyển
- [ ] **P3-12** Chức năng Invite/Reject ứng viên (Bên A) _(SCR-05)_
- [ ] **P3-13** Quy tắc: Campaign cũ không thể xóa, chỉ Archive
- [ ] **P3-14** Test: tạo Campaign khi không đủ số dư → bị chặn đúng thông báo
- [ ] **P3-15** Test: 1 user tạo 2 tài khoản ứng tuyển cùng Campaign → bị chặn bởi Fingerprint/IP

---

## Phase 4 — Submission, Proof & Auto-Approve

**Mục tiêu:** Vòng đời ứng tuyển → review → nộp proof có watermark → duyệt (người hoặc tự động 48h).

- [ ] **P4-01** Bảng `submissions` (migration + model, có `auto_approve_at`)
- [ ] **P4-02** Form Làm Survey & Submit Proof — upload ảnh/video _(SCR-07)_
- [ ] **P4-03** API `POST /api/v1/submissions/:id/proof` (multipart) _(FN-TASK-01)_
- [ ] **P4-04** Thiết lập Queue (BullMQ/Redis) xử lý watermark bất đồng bộ
- [ ] **P4-05** Worker chèn Watermark UserID + CampaignID lên ảnh
- [ ] **P4-06** Worker chèn Watermark UserID + CampaignID lên video
- [ ] **P4-07** UI trạng thái "đang xử lý" trong lúc chờ watermark hoàn tất
- [ ] **P4-08** Giới hạn: Bên B chỉ nhận tối đa 1 slot/campaign
- [ ] **P4-09** Cronjob Auto-Approve 48h — quét `submissions` quá hạn _(FN-TASK-02)_
- [ ] **P4-10** Luồng Bên A duyệt/từ chối Proof (nối từ SCR-05)
- [ ] **P4-11** Hoàn thiện Dashboard Bên B với dữ liệu thật (KPoint kiếm được, nhiệm vụ đang làm) _(SCR-06)_
- [ ] **P4-12** Test watermark xuất hiện đúng trên ảnh + video mẫu
- [ ] **P4-13** Test cronjob chạy đúng giờ trên staging + không trả thưởng trùng khi chạy nhiều lần

---

## Phase 5 — Dispute Center

**Mục tiêu:** Luồng tranh chấp 3 vai trò (Bên B tạo → Moderator đề xuất → Admin phán quyết) không rò rỉ/nhân đôi KPoint.

- [ ] **P5-01** Bảng `disputes` (migration + model)
- [ ] **P5-02** API `POST /api/v1/disputes` — Tạo Khiếu nại khi Bên A từ chối Proof _(FN-DISP-01)_
- [ ] **P5-03** Phong tỏa KPoint của slot liên quan khi Dispute mở
- [ ] **P5-04** Màn hình CMS Tranh chấp (Dispute Center) — xem bằng chứng 2 bên _(SCR-11)_
- [ ] **P5-05** API `PUT /api/v1/mod/disputes/:id/recommend` _(FN-DISP-02)_
- [ ] **P5-06** Guard: Moderator chỉ được `Pend Approval`/`Pend Reject`, không duyệt chi trực tiếp
- [ ] **P5-07** API `POST /api/v1/admin/disputes/:id/resolve` _(FN-DISP-03)_
- [ ] **P5-08** Giải phóng KPoint đúng bên thắng sau phán quyết Admin
- [ ] **P5-09** Thông báo (email/app) cho Bên A & Bên B khi có cập nhật Dispute
- [ ] **P5-10** Test nhánh "thắng Bên A" — giải phóng đúng số KPoint, không rò rỉ
- [ ] **P5-11** Test nhánh "thắng Bên B" — giải phóng đúng số KPoint, không rò rỉ
- [ ] **P5-12** Test RBAC: Moderator không gọi được trực tiếp API phán quyết cuối

---

## Phase 6 — Thanh toán Quốc tế (BMC) & Audit Logs

**Mục tiêu:** Admin duyệt nạp quốc tế thủ công an toàn; mọi thao tác nhạy cảm đều truy vết được.

- [ ] **P6-01** Bảng `bmc_topups` (migration + model)
- [ ] **P6-02** Form nạp Buy Me a Coffee — nhập Transaction ID + upload Receipt _(FN-PAY-02)_
- [ ] **P6-03** API `POST /api/v1/payments/bmc-topup` — trạng thái `PENDING_MANUAL_VERIFICATION`
- [ ] **P6-04** Màn hình CMS Duyệt Nạp Tiền Quốc Tế — xem Receipt, Approve/Reject _(SCR-10)_
- [ ] **P6-05** API `POST /api/v1/admin/payments/bmc/:id/approve` — ACID Transaction cộng KPoint _(FN-PAY-03)_
- [ ] **P6-06** Gửi email xác nhận khi Approve; thông báo hủy khi Reject
- [ ] **P6-07** Bảng `audit_logs` (migration + model, JSON Diff before/after)
- [ ] **P6-08** Interceptor NestJS ghi Audit Log cho mọi Mutation (CREATE/UPDATE/DELETE/DISPUTE_RESOLVE/MANUAL_TOPUP) _(FN-LOG-01)_
- [ ] **P6-09** Ghi kèm IP Address + Device Fingerprint vào mỗi Audit Log
- [ ] **P6-10** Màn hình CMS Quản lý Audit Logs — bộ lọc (thời gian/User/Role/Action/Level) _(SCR-13)_
- [ ] **P6-11** Bảng hiển thị Nhật ký + popup Log Detail (JSON viewer) _(SCR-13)_
- [ ] **P6-12** Đánh dấu đỏ hành vi `CRITICAL` (hạ cấp Admin, sửa số dư thủ công, duyệt dispute lớn, IP lạ)
- [ ] **P6-13** API `GET /api/v1/admin/audit-logs` (phân trang, filter)
- [ ] **P6-14** Test: 100% hành động trong danh sách CRITICAL đều xuất hiện đúng định dạng trong Audit Log
- [ ] **P6-15** Rà soát không còn "backdoor endpoint" nào bỏ qua ghi log

---

## Phase 7 — CMS Admin & RBAC nâng cao

**Mục tiêu:** Admin/Root Admin vận hành toàn bộ hệ thống qua CMS, không cần đụng DB trực tiếp.

- [ ] **P7-01** Màn hình CMS Overview & Thống kê _(SCR-09)_
- [ ] **P7-02** Thống kê KPoint lưu thông
- [ ] **P7-03** Thống kê số lượt review/ngày
- [ ] **P7-04** Thống kê doanh thu phí khởi tạo Campaign
- [ ] **P7-05** Màn hình CMS Quản lý RBAC & Root Admin _(SCR-12)_
- [ ] **P7-06** Chức năng tạo role + gán permission
- [ ] **P7-07** Chức năng gán quyền Admin/Moderator
- [ ] **P7-08** Chức năng phân công Campaign cho Moderator cụ thể
- [ ] **P7-09** Hoàn thiện Admin duyệt lệnh rút tiền về ngân hàng (nối từ Phase 2)
- [ ] **P7-10** Rà soát & hoàn thiện toàn bộ ràng buộc RBAC còn lại theo bảng Section II SRS
- [ ] **P7-11** Test: Root Administrator tạo/xóa Admin khác → hành động được Audit Log ghi đầy đủ

---

## Phase 8 — Hardening, QA & Go-live

**Mục tiêu:** Hệ thống sẵn sàng vận hành thật, có giám sát 48h đầu sau go-live.

- [ ] **P8-01** Kiểm thử OWASP Top 10 cơ bản (injection, IDOR giữa các role)
- [ ] **P8-02** Kiểm thử rate-limit cho luồng Auth
- [ ] **P8-03** Kiểm thử tải cho luồng Nạp tiền (mục tiêu p95 < 500ms)
- [ ] **P8-04** Kiểm thử tải cho luồng Rút tiền
- [ ] **P8-05** Kiểm thử tải cho luồng Dispute
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
- [ ] **B-02** Chốt chính sách version hóa tỷ giá KPoint ↔ VNĐ ↔ USD theo thời gian — cần trước Phase 2 & 6
- [ ] **B-03** Chốt SLA xử lý Dispute (thời gian Admin phải duyệt)
- [ ] **B-04** Chốt SLA duyệt Nạp Quốc tế (thời gian Admin phải duyệt)
- [ ] **B-05** Chốt ngưỡng Trust Score cụ thể & quy tắc khóa tài khoản gian lận
- [ ] **B-06** Đối chiếu lại Ma trận FN/SCR (PLAN.md § 6) mỗi khi SRS được bổ sung

---

<div align="center">
<sub>© 2026 K-Platform — Cập nhật file này mỗi khi hoàn thành task hoặc khi PLAN.md/SRS thay đổi.</sub>
</div>
