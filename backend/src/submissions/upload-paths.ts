import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Thư mục lưu file Proof (ảnh/video) — gốc & sau Watermark. Mount volume
// Docker vào đây khi deploy (xem infra/docker-compose.deploy.yml) để không
// mất file giữa các lần redeploy container.
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const PROOFS_DIR = join(UPLOADS_ROOT, 'proofs');
export const WATERMARKED_DIR = join(UPLOADS_ROOT, 'watermarked');

export function ensureUploadDirs(): void {
  mkdirSync(PROOFS_DIR, { recursive: true });
  mkdirSync(WATERMARKED_DIR, { recursive: true });
}
