import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { DecideWithdrawalDto } from './dto/decide-withdrawal.dto.js';
import { WithdrawalStatus, AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { Audit } from '../audit/audit.decorator.js';

// CMS "Yêu cầu rút tiền" — danh sách + duyệt/từ chối lệnh rút KPoint của
// Tài khoản người dùng. Chỉ Admin/Root Admin (ảnh hưởng tiền thật rời ví).
@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminWithdrawalsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequirePermission(['withdrawals', 'READ'])
  @Get()
  list(@Query('status') status?: string) {
    const normalized =
      status && status in WithdrawalStatus ? (status as WithdrawalStatus) : undefined;
    return this.payments.listAllWithdrawals(normalized);
  }

  @Audit({ level: AuditLevel.CRITICAL })
  @RequirePermission(['withdrawals', 'APPROVE'])
  @Patch(':id/decision')
  decide(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: DecideWithdrawalDto,
  ) {
    return this.payments.decideWithdrawal(admin.sub, id, dto);
  }
}
