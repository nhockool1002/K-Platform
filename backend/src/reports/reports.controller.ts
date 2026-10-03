import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService, type ReportPeriod } from './reports.service.js';
import { UserRole } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

const VALID_PERIODS: ReportPeriod[] = ['day', 'month', 'year', 'all'];

// CMS "Thống kê doanh thu" (issue #55) — dữ liệu tài chính toàn hệ thống,
// chỉ Admin/Root Admin xem được (không mở cho Moderator, khác Dispute Center).
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  getOverview(@Query('period') period?: string) {
    const normalized: ReportPeriod =
      period && (VALID_PERIODS as string[]).includes(period) ? (period as ReportPeriod) : 'month';
    return this.reports.getOverview(normalized);
  }
}
