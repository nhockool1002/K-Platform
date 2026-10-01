# Infra — Staging & Production (P0-10)

> Trạng thái: **khung sẵn sàng, chưa trỏ vào máy chủ thật.** Phần này cần một người có quyền truy cập hạ tầng thật (VPS/cloud account) điền vào — không thể hoàn thiện chỉ bằng code.

## Vì sao chưa "dựng" được staging thật ở bước này

`docker-compose.yml` ở root đã đủ để chạy toàn bộ stack (frontend + backend + Postgres + Redis) trên **bất kỳ máy nào có Docker** — đó là phần "hạ tầng tối thiểu" có thể chuẩn bị trước bằng code. Việc "dựng môi trường Staging" theo đúng nghĩa (một server/VM chạy liên tục, có domain, có HTTPS) đòi hỏi:

- Một VPS/cloud instance thật (DigitalOcean, AWS Lightsail, Hetzner, v.v.) hoặc một PaaS (Railway, Render, Fly.io...).
- Domain/subdomain trỏ vào đó (vd. `staging.kplatform.dev`).
- Secrets thật (SePay sandbox key, OAuth client ID, DB password) — không đặt trong repo.

Không mục nào trong số này có thể tạo ra từ phiên làm việc này. Khi đã có, làm theo checklist dưới.

## Checklist dựng Staging (khi có server)

1. Cài Docker + Docker Compose trên server.
2. Clone repo, checkout nhánh `staging`.
3. Copy `.env.example` → `.env`, điền secrets thật của môi trường staging.
4. `docker compose up -d --build`.
5. Chạy migration: `docker compose exec backend pnpm prisma:deploy`.
6. (Tuỳ chọn) Seed dữ liệu demo: `docker compose exec backend pnpm prisma:seed`.
7. Trỏ domain + cấu hình reverse proxy/HTTPS (Caddy/Nginx/Traefik — chưa có trong repo, thêm khi chọn server).
8. Điền 4 secret vào GitHub repo (Settings → Environments → `staging`) để workflow `.github/workflows/deploy-staging.yml` chạy được:
   - `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_KEY`, `STAGING_DEPLOY_PATH`.

## Production

Tương tự Staging nhưng dùng `.github/workflows/deploy-production.yml`, trigger khi push vào `main`, và set secrets trong GitHub Environment `production`. **Không bao giờ** trỏ production và staging dùng chung DB/Redis.

## Ghi chú bảo mật

- Không bao giờ commit file `.env` thật (đã có trong `.gitignore`).
- JWT secrets, SePay key, OAuth client secret: luôn set qua GitHub Environment Secrets, không hardcode.
