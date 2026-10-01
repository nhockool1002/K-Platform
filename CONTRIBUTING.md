# Contributing — K-Platform

Quy ước làm việc cho repo này. Đọc trước khi tạo branch/commit đầu tiên.

## 1. Cấu trúc nhánh

```
feature/<mô-tả>  →  develop  →  staging  →  main
```

| Nhánh             | Vai trò                                       | Ai merge vào                                     |
| ----------------- | --------------------------------------------- | ------------------------------------------------ |
| `main`            | Production — luôn ở trạng thái deploy được    | chỉ nhận merge từ `staging`                      |
| `staging`         | Pre-production, nơi test trước khi lên `main` | chỉ nhận merge từ `develop`                      |
| `develop`         | Tích hợp tính năng                            | nhận merge từ các `feature/*`                    |
| `feature/<mô-tả>` | 1 task/1 nhóm task nhỏ                        | tạo từ `develop`, merge lại vào `develop` qua PR |

**Không bao giờ** commit thẳng vào `develop`, `staging`, hoặc `main`. Luôn đi qua Pull Request.

Thứ tự merge bắt buộc: `feature → develop → staging → main` — không merge tắt (vd. feature thẳng vào staging) để tránh lệch lịch sử và conflict khi `develop`/`staging` xa nhau.

## 2. Đặt tên nhánh & commit

- Nhánh: `feature/p0-01-monorepo-setup`, `feature/fn-auth-01-switch-mode`, `fix/wallet-race-condition`...
  Ưu tiên gắn mã Task từ [`TASK.md`](TASK.md) (vd. `P1-07`) vào tên nhánh để dễ truy vết.
- Commit message: ngắn gọn, nêu **tại sao** thay vì chỉ **làm gì**. Có thể tham chiếu mã Task, vd:

  ```
  Add switch-mode endpoint keeping JWT session intact (P1-07)
  ```

## 3. Quy trình Pull Request

1. Tạo nhánh `feature/...` từ `develop` mới nhất (`git checkout develop && git pull && git checkout -b feature/...`).
2. Trước khi mở PR, chạy ở root:
   ```bash
   pnpm format:check
   pnpm lint
   pnpm build
   pnpm test
   ```
   CI (`.github/workflows/ci.yml`) chạy lại đúng 4 bước này trên mỗi PR/push vào `develop`/`staging`/`main` — nên fail cục bộ sẽ fail CI.
3. Mở PR nhắm vào `develop`, mô tả rõ Task/FN/SCR liên quan, tick lại checklist trong `TASK.md` sau khi merge.
4. Ít nhất 1 reviewer duyệt trước khi merge (khi team > 1 người).
5. Định kỳ cuối mỗi Phase (xem `PLAN.md`): mở PR `develop → staging` để demo/test tổng hợp, sau đó `staging → main` để phát hành.

## 4. Trước khi code — đọc 3 file này

- [`README.md`](README.md) — đặc tả SRS (nghiệp vụ, API, DB schema).
- [`PLAN.md`](PLAN.md) — lộ trình 9 Phase, tech stack, DoD từng Phase.
- [`TASK.md`](TASK.md) — danh sách task chi tiết để tick tiến độ.

## 5. Môi trường dev

Xem phần "Dev nhanh" trong [`infra/README.md`](infra/README.md) và `docker-compose.dev.yml`. Tóm tắt:

```bash
cp backend/.env.example backend/.env
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis
pnpm install
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev:backend     # terminal 1
pnpm dev:frontend    # terminal 2
```

## 6. Coding convention

- TypeScript strict mode bật ở cả 2 workspace (`tsconfig.base.json`) — không tắt `strict` cục bộ.
- ESLint + Prettier bắt buộc qua Husky pre-commit (`npx lint-staged` tự chạy khi `git commit`). Nếu hook fail, sửa lỗi rồi commit lại — không dùng `--no-verify`.
- Không thêm thư viện mới vào `dependencies` mà không có lý do rõ trong PR description.
