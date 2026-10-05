import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSION_KEY, type PermissionRequirement } from './require-permission.decorator.js';
import { PermissionService, permissionDeniedMessage } from './permission.service.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

// Chạy SAU JwtAuthGuard (req.user đã có). Route không khai báo quyền → không kiểm tra
// ở đây (route người dùng thường).
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirements = this.reflector.getAllAndOverride<PermissionRequirement[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requirements?.length) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    if (!req.user) throw new UnauthorizedException('Thiếu access token');

    const eff = await this.permissions.effectiveFor(req.user.sub);
    if (eff.isRoot) return true;

    for (const r of requirements) {
      if (!eff.keys.has(`${r.resource}:${r.action}`)) {
        throw new ForbiddenException(permissionDeniedMessage(r.resource, r.action));
      }
    }
    return true;
  }
}
