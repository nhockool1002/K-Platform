import type { Request } from 'express';
import type { AccessTokenPayload } from '../auth/token.types.js';
import type { AuditContext } from './audit-context.js';
import { hashDeviceFingerprint, sanitizeForAudit } from './audit-sanitize.js';

export function buildAuditContext(req: Request): AuditContext {
  const user = (req as Request & { user?: AccessTokenPayload }).user;
  const rawFingerprint =
    (typeof req.body?.fingerprint === 'string' ? req.body.fingerprint : null) ??
    req.get('x-device-fingerprint') ??
    null;
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
    deviceFingerprint: rawFingerprint ? hashDeviceFingerprint(rawFingerprint) : null,
    method: req.method,
    path: req.originalUrl.split('?')[0] ?? req.path,
    actorId: user?.sub ?? null,
    actorRole: user?.role ?? null,
    requestPayload:
      req.body && typeof req.body === 'object'
        ? (sanitizeForAudit(req.body) as Record<string, unknown>)
        : null,
    written: false,
  };
}
