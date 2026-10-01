# K-Point Platform — frontend (Next.js, standalone output) image.
# Build context PHẢI là thư mục gốc repo: `docker build -f frontend/Dockerfile .`

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY frontend ./frontend
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile
RUN pnpm --filter frontend build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./frontend/.next/static
COPY --from=build /app/frontend/public ./frontend/public
EXPOSE 3000
CMD ["node", "frontend/server.js"]
