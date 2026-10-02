# Infra — Staging & Production

Hướng dẫn đầy đủ, từng bước đã chuyển sang **[`DEPLOY.md`](../DEPLOY.md)** ở thư mục gốc repo — bao gồm cả phần chuẩn bị VPS/aaPanel, Vercel, và cấu hình GitHub Secrets.

Tóm tắt kiến trúc (chi tiết xem DEPLOY.md):

- **Backend** (NestJS + PostgreSQL + Redis): chạy bằng Docker trên VPS có aaPanel, dùng chung VPS với các site khác. Deploy tự động qua `.github/workflows/deploy-staging.yml` / `deploy-production.yml` (SSH + `docker compose -f infra/docker-compose.deploy.yml`).
- **Frontend** (Next.js): deploy lên Vercel qua Git integration riêng (không qua GitHub Actions).
- `infra/docker-compose.deploy.yml` — stack backend-only dùng trên VPS (không publish port Postgres/Redis ra ngoài, backend chỉ bind `127.0.0.1`, aaPanel's Nginx reverse-proxy + SSL).
- `infra/.env.deploy.example` — template file `.env` đặt trực tiếp trên VPS (không commit).

**Không bao giờ** trỏ staging và production dùng chung DB/Redis/JWT secret — mỗi môi trường có thư mục checkout + `.env` + container riêng trên VPS.
