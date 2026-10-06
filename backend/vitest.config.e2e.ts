import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Mọi file e2e dùng chung 1 Postgres thật (DATABASE_URL). Từ Phase 2
    // "Cài đặt SePay", settings.e2e-spec.ts ghi vào SystemSetting key="sepay"
    // — một singleton THỰC SỰ dùng chung toàn hệ thống (khác User/Campaign
    // trước giờ luôn tạo bằng email/id duy nhất mỗi lần chạy) — nếu các file
    // chạy song song, payments.e2e-spec.ts (dựa vào fallback biến môi trường
    // SEPAY_*) có thể đọc nhầm giá trị DB mà settings.e2e-spec.ts vừa ghi.
    // Chạy tuần tự để loại hẳn race này.
    fileParallelism: false,
  },
});
