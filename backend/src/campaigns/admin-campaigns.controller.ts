import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service.js';
import { AssignModeratorDto } from './dto/assign-moderator.dto.js';
import { UpdateCampaignAdminDto } from './dto/update-campaign-admin.dto.js';
import { AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';

import { Audit } from '../audit/audit.decorator.js';

// P7-08/SCR-12 — phân công Campaign cho Moderator cụ thể. Chỉ Admin/Root
// Admin (cùng cấp với CMS RBAC còn lại), không mở cho chính Moderator tự ý
// nhận/bỏ Campaign.
@Controller('admin/campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminCampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @RequirePermission(['campaigns', 'READ'])
  @Get()
  list() {
    return this.campaigns.listAllForAdmin();
  }

  @Audit({ level: AuditLevel.WARNING })
  @RequirePermission(['campaigns', 'UPDATE'])
  @Patch(':id/assign-moderator')
  assignModerator(@Param('id') id: string, @Body() dto: AssignModeratorDto) {
    return this.campaigns.assignModerator(id, dto.moderatorId ?? null);
  }

  // SCR-21 — chi tiết Campaign (slot đã chiếm, số KPoint sẽ hoàn khi lưu trữ).
  @RequirePermission(['campaigns', 'READ'])
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.campaigns.getAdminDetail(id);
  }

  @Audit({ level: AuditLevel.WARNING })
  @RequirePermission(['campaigns', 'UPDATE'])
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignAdminDto) {
    return this.campaigns.updateForAdmin(id, dto);
  }

  // "Xoá" trong CMS = lưu trữ (không xoá cứng) + hoàn ký quỹ slot chưa dùng.
  @Audit({ level: AuditLevel.CRITICAL })
  @RequirePermission(['campaigns', 'DELETE'])
  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.campaigns.archiveForAdmin(id);
  }
}
