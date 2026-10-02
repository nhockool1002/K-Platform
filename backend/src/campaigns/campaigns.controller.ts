import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CampaignsService } from './campaigns.service.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { ApplyCampaignDto } from './dto/apply-campaign.dto.js';
import { ApplicantActionDto } from './dto/applicant-action.dto.js';
import { ListCampaignsQueryDto } from './dto/list-campaigns-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../auth/token.types.js';

// Lấy IP thật của client — ưu tiên X-Forwarded-For (sau reverse proxy aaPanel
// Nginx, xem DEPLOY.md), fallback về socket IP khi chạy trực tiếp (vd. dev).
function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? null;
}

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  // P3-03 (FN-CAMP-01) — chỉ Bên A (activeMode A) được tạo Campaign.
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateCampaignDto) {
    assertActiveMode(user, 'A', 'tạo Campaign');
    return this.campaigns.create(user.sub, dto);
  }

  // P3-05/P3-06 (SCR-01) — public, không cần đăng nhập.
  @Get()
  listPublic(@Query() query: ListCampaignsQueryDto) {
    return this.campaigns.listPublic(query);
  }

  // P3-07 — Dashboard Bên A.
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  listMine(@CurrentUser() user: AccessTokenPayload) {
    assertActiveMode(user, 'A', 'xem Campaign của bạn');
    return this.campaigns.listMine(user.sub);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.campaigns.getOne(id);
  }

  // P3-09/P3-10/P3-11 (FN-CAMP-02) — chỉ Bên B (activeMode B) được ứng tuyển.
  @UseGuards(JwtAuthGuard)
  @Post(':id/apply')
  apply(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: ApplyCampaignDto,
  ) {
    assertActiveMode(user, 'B', 'ứng tuyển Campaign');
    return this.campaigns.apply(id, user.sub, clientIp(req), dto);
  }

  // P3-08 (SCR-05) — chủ Campaign xem danh sách ứng viên.
  @UseGuards(JwtAuthGuard)
  @Get(':id/applicants')
  listApplicants(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.campaigns.listApplicants(id, user.sub);
  }

  // P3-12 — Invite/Reject ứng viên.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/applicants/:submissionId')
  decideApplicant(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: ApplicantActionDto,
  ) {
    return this.campaigns.decideApplicant(id, submissionId, user.sub, dto);
  }

  // P3-13 — chỉ Archive, không có endpoint DELETE nào cho Campaign.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/archive')
  archive(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.campaigns.archive(id, user.sub);
  }
}

function assertActiveMode(user: AccessTokenPayload, mode: 'A' | 'B', action: string) {
  if (user.activeMode !== mode) {
    const label = mode === 'A' ? 'Bên A (Advertiser)' : 'Bên B (Publisher)';
    throw new ForbiddenException(`Chỉ ${label} mới được ${action}. Hãy Switch Mode trước.`);
  }
}
