import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  InternationalPaymentsService,
  type TopupSource,
} from './international-payments.service.js';
import { InternationalPackagesService } from './international-packages.service.js';
import { DecideBmcTopupDto } from './dto/decide-bmc-topup.dto.js';
import {
  CreateInternationalPackageDto,
  UpdateInternationalPackageDto,
} from './dto/international-package.dto.js';
import { BmcTopupStatus, AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';
import { Audit } from '../audit/audit.decorator.js';
import type { Response } from 'express';

const SOURCES: TopupSource[] = ['SEPAY', 'BMC'];

// CMS "Đối soát nạp tiền" (SCR-10) + "Thanh toán quốc tế" — chỉ Admin/Root Admin
// vì duyệt là thao tác cộng KPoint thật vào ví.
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminInternationalPaymentsController {
  constructor(
    private readonly payments: InternationalPaymentsService,
    private readonly packages: InternationalPackagesService,
  ) {}

  @RequirePermission(['payments_reconciliation', 'READ'])
  @Get('topups')
  listTopups(@Query('source') source?: string, @Query('status') status?: string) {
    const normalizedSource =
      source && SOURCES.includes(source as TopupSource) ? (source as TopupSource) : undefined;
    const normalizedStatus =
      status && status in BmcTopupStatus ? (status as BmcTopupStatus) : undefined;
    return this.payments.listForReconciliation(normalizedSource, normalizedStatus);
  }

  @Audit({ level: AuditLevel.CRITICAL })
  @RequirePermission(['payments_reconciliation', 'APPROVE'])
  @Patch('bmc/topups/:id/decision')
  decide(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideBmcTopupDto,
  ) {
    return this.payments.decide(admin.sub, id, dto);
  }

  @RequirePermission(['payments_reconciliation', 'READ'])
  @Get('bmc/topups/:id/receipt')
  async receipt(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const path = await this.payments.getReceiptPath(id);
    res.sendFile(path);
  }

  @RequirePermission(['international_packages', 'READ'])
  @Get('bmc/packages')
  listPackages() {
    return this.packages.listAll();
  }

  @RequirePermission(['international_packages', 'CREATE'])
  @Post('bmc/packages')
  createPackage(
    @CurrentUser() admin: AccessTokenPayload,
    @Body() dto: CreateInternationalPackageDto,
  ) {
    return this.packages.create(admin.sub, dto);
  }

  @RequirePermission(['international_packages', 'UPDATE'])
  @Patch('bmc/packages/:id')
  updatePackage(
    @CurrentUser() admin: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInternationalPackageDto,
  ) {
    return this.packages.update(admin.sub, id, dto);
  }

  @RequirePermission(['international_packages', 'DELETE'])
  @Delete('bmc/packages/:id')
  removePackage(@CurrentUser() admin: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.packages.remove(admin.sub, id);
  }
}
