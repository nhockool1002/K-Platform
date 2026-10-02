import { CanActivate, type ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { ROOT_ADMIN_ID } from '../constants.js';

// P1-09: chặn mọi API xóa/hạ cấp Root Administrator — bất kể role của người gọi.
// Áp dụng trên các route có `:id` trỏ tới user mục tiêu (xóa, đổi role, v.v).
@Injectable()
export class RootAdminTargetGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const targetId = request.params?.id;

    if (targetId === ROOT_ADMIN_ID) {
      throw new ForbiddenException('Không thể xóa hoặc hạ cấp tài khoản Root Administrator');
    }

    return true;
  }
}
