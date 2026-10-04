import { createHash } from 'node:crypto';

const SECRET_KEY = /pass(word)?|token|secret|api_?key|authorization|cookie/i;
const MAX_STRING = 500;
const MAX_DEPTH = 6;

// P6-15 — audit log không được chứa credential: khoá nhạy cảm bị thay bằng
// [redacted], chuỗi quá dài bị cắt để payload không phình bảng.
export function sanitizeForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return '[depth-limited]';
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeForAudit(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) ? '[redacted]' : sanitizeForAudit(v, depth + 1);
  }
  return out;
}

export function hashDeviceFingerprint(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
