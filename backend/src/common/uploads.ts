import { BadRequestException } from '@nestjs/common';
import { open, unlink } from 'node:fs/promises';
import sharp from 'sharp';

// Phần mở rộng luôn lấy từ MIME đã được whitelist, KHÔNG lấy từ tên file gốc —
// tránh file .html/.svg đội lốt ảnh rồi được phục vụ như tài liệu có script.
const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

export function extForMime(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null;
}

export const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;

// Kiểm tra nội dung thật của file (không tin MIME client gửi lên). Sai → xoá file và từ chối.
export async function assertFileContent(path: string, mime: string): Promise<void> {
  const valid = await hasValidSignature(path, mime);
  if (!valid) {
    await unlink(path).catch(() => undefined);
    throw new BadRequestException('Nội dung file không khớp định dạng đã khai báo');
  }
}

async function hasValidSignature(path: string, mime: string): Promise<boolean> {
  if ((IMAGE_MIMES as readonly string[]).includes(mime)) {
    try {
      const meta = await sharp(path).metadata();
      return meta.format === 'png' || meta.format === 'jpeg' || meta.format === 'webp';
    } catch {
      return false;
    }
  }
  if (mime === 'application/pdf') {
    const fh = await open(path, 'r');
    try {
      const buf = Buffer.alloc(5);
      await fh.read(buf, 0, 5, 0);
      return buf.toString('latin1') === '%PDF-';
    } finally {
      await fh.close();
    }
  }
  // Video: kiểm tra MIME + phần mở rộng (không có decoder video trong image hiện tại).
  return mime.startsWith('video/');
}
