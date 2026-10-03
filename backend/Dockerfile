# K-Platform — backend (NestJS) image.
# Build context PHẢI là thư mục gốc repo: `docker build -f backend/Dockerfile .`
# (xem docker-compose.yml ở root — đã cấu hình sẵn context đúng).
# Dùng `pnpm deploy` để tạo thư mục self-contained, tránh lỗi symlink của pnpm store khi copy giữa stage.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json .npmrc ./
COPY backend ./backend
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile
RUN pnpm --filter backend prisma:generate
RUN pnpm --filter backend build
# --legacy: pnpm v10 mặc định chỉ deploy workspace có inject-workspace-packages=true.
# backend không inject package workspace nào (frontend/package.json chỉ copy để
# pnpm install không báo thiếu thành viên workspace) — legacy là đúng cho case này.
RUN pnpm --filter backend deploy --prod --legacy /app/deploy
# pnpm deploy không đảm bảo copy backend/generated/ (output tuỳ chỉnh của `prisma
# generate` — xem schema.prisma, nằm ngoài node_modules) — copy thủ công để chắc
# chắn Prisma Client (kèm query engine binary) luôn có trong image runtime. Dùng
# output tuỳ chỉnh thay vì node_modules/.prisma/client mặc định vì pnpm deploy
# --legacy không bảo toàn đúng cấu trúc node_modules/.prisma của pnpm, từng gây lỗi
# "Cannot find module '.prisma/client/default'" lúc runtime.
RUN cp -r backend/generated /app/deploy/generated

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
# P4-06 (FN-TASK-01) — ffmpeg để chèn Watermark lên video Proof (drawtext
# filter cần fontfile tường minh — font-dejavu cung cấp
# /usr/share/fonts/dejavu/DejaVuSans-Bold.ttf, xem watermark.processor.ts).
RUN apk add --no-cache ffmpeg font-dejavu
COPY --from=build /app/deploy/dist ./dist
COPY --from=build /app/deploy/generated ./generated
COPY --from=build /app/deploy/prisma ./prisma
COPY --from=build /app/deploy/prisma.config.ts ./prisma.config.ts
# `prisma/seed.ts` chạy trực tiếp qua `node --experimental-strip-types` (không qua
# build), nên cần src/ gốc có mặt trong image — seed import từ src/prisma/client.ts
# và src/common/constants.ts.
COPY --from=build /app/deploy/src ./src
COPY --from=build /app/deploy/node_modules ./node_modules
COPY --from=build /app/deploy/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/main.js"]
