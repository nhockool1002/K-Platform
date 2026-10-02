# K-Platform — backend (NestJS) image.
# Build context PHẢI là thư mục gốc repo: `docker build -f backend/Dockerfile .`
# (xem docker-compose.yml ở root — đã cấu hình sẵn context đúng).
# Dùng `pnpm deploy` để tạo thư mục self-contained, tránh lỗi symlink của pnpm store khi copy giữa stage.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY backend ./backend
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile
RUN pnpm --filter backend prisma:generate
RUN pnpm --filter backend build
RUN pnpm --filter backend deploy --prod /app/deploy

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/deploy/dist ./dist
COPY --from=build /app/deploy/prisma ./prisma
COPY --from=build /app/deploy/node_modules ./node_modules
COPY --from=build /app/deploy/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/main.js"]
