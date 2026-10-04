import { CanActivate, type ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { ROOT_ADMIN_ID } from '../constants.js';
import type { AccessTokenPayload } from '../../auth/token.types.js';

// CMS Quản Trị Tài Khoản — "Root thì chỉ có root tự chỉnh, các user và quản
// trị khác không có quyền điều chỉnh user root" (yêu cầu gốc). Khác
// RootAdminTargetGuard (luôn chặn tuyệt đối, dùng cho role-change/delete) —
// guard này CHO PHÉP đi tiếp nếu chính Root đang thao tác lên chính mình
// (sửa email/mật khẩu/hồ sơ), chỉ chặn khi người khác nhắm vào Root.
@Injectable()
export class RootAdminSelfOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const targetId = request.params?.id;
    if (targetId !== ROOT_ADMIN_ID) return true;

    const actor: AccessTokenPayload | undefined = request.user;
    if (actor?.sub === ROOT_ADMIN_ID) return true;

    throw new ForbiddenException(
      'Chỉ Root Administrator được phép tự chỉnh tài khoản của chính mình',
    );
  }
}
