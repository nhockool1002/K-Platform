import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CmsOpsService } from './cms-ops.service.js';
import { AdjustWalletDto } from './dto/cms-ops.dto.js';
import { AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';
import { Audit } from '../audit/audit.decorator.js';

// SCR-23 — tra cứu ví & sổ cái người dùng, điều chỉnh số dư có lý do.
@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminWalletsController {
  constructor(private readonly ops: CmsOpsService) {}

  @RequirePermission(['wallets', 'READ'])
  @Get()
  list(@Query('search') search?: string) {
    return this.ops.listWallets(search);
  }

  @RequirePermission(['wallets', 'READ'])
  @Get(':userId/transactions')
  transactions(@Param('userId') userId: string) {
    return this.ops.listWalletTransactions(userId);
  }

  @Audit({ level: AuditLevel.CRITICAL })
  @RequirePermission(['wallets', 'UPDATE'])
  @Post(':userId/adjustments')
  adjust(@Param('userId') userId: string, @Body() dto: AdjustWalletDto) {
    return this.ops.adjustWallet(userId, dto);
  }
}
