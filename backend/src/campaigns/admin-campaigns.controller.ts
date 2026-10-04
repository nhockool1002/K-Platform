import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service.js';
import { AssignModeratorDto } from './dto/assign-moderator.dto.js';
import { UserRole, AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Audit } from '../audit/audit.decorator.js';

// P7-08/SCR-12 — phân công Campaign cho Moderator cụ thể. Chỉ Admin/Root
// Admin (cùng cấp với CMS RBAC còn lại), không mở cho chính Moderator tự ý
// nhận/bỏ Campaign.
@Controller('admin/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
export class AdminCampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list() {
    return this.campaigns.listAllForAdmin();
  }

  @Audit({ level: AuditLevel.WARNING })
  @Patch(':id/assign-moderator')
  assignModerator(@Param('id') id: string, @Body() dto: AssignModeratorDto) {
    return this.campaigns.assignModerator(id, dto.moderatorId ?? null);
  }
}
