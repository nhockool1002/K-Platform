import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TrustScoreRulesService } from './trust-score-rules.service.js';
import { CreateTrustScoreRuleDto } from './dto/create-trust-score-rule.dto.js';
import { UpdateTrustScoreRuleDto } from './dto/update-trust-score-rule.dto.js';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/permissions.guard.js';
import { RequirePermission } from '../rbac/require-permission.decorator.js';

// B-05/CMS Quản Trị Tài Khoản — danh sách lý do +/- Trust Score.
@Controller('admin/trust-score/rules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrustScoreRulesController {
  constructor(private readonly rules: TrustScoreRulesService) {}

  @RequirePermission(['trust_score', 'READ'])
  @Get()
  list() {
    return this.rules.list();
  }

  @RequirePermission(['trust_score', 'CREATE'])
  @Post()
  create(@Body() dto: CreateTrustScoreRuleDto) {
    return this.rules.create(dto);
  }

  @RequirePermission(['trust_score', 'UPDATE'])
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrustScoreRuleDto) {
    return this.rules.update(id, dto);
  }

  @RequirePermission(['trust_score', 'DELETE'])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rules.remove(id);
  }
}
