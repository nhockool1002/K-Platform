import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { SubmissionsService } from './submissions.service.js';
import { DecideProofDto } from './dto/decide-proof.dto.js';
import { AuditLevel } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';
import { Audit } from '../audit/audit.decorator.js';

// SCR-22 — Admin/Mod xem hàng đợi Proof và duyệt/từ chối thủ công, không cần
// là chủ Campaign (hữu ích khi Bên A vắng mặt, hoặc watermark kẹt).
@Controller('admin/submissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminSubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @RequirePermission(['submissions', 'READ'])
  @Get()
  list(@Query('stuckWatermark') stuckWatermark?: string) {
    return this.submissions.listProofsForAdmin({ stuckWatermark: stuckWatermark === 'true' });
  }

  @Audit({ level: AuditLevel.WARNING })
  @RequirePermission(['submissions', 'APPROVE'])
  @Patch(':id/decision')
  decide(@Param('id') id: string, @Body() dto: DecideProofDto) {
    return this.submissions.decideProofAsAdmin(id, dto.action, dto.reason);
  }
}
