import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TrustScoreRulesService } from './trust-score-rules.service.js';
import { CreateTrustScoreRuleDto } from './dto/create-trust-score-rule.dto.js';
import { UpdateTrustScoreRuleDto } from './dto/update-trust-score-rule.dto.js';
import { UserRole } from '../prisma/client.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// B-05/CMS Quản Trị Tài Khoản — danh sách lý do +/- Trust Score.
@Controller('admin/trust-score/rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ROOT_ADMIN)
export class TrustScoreRulesController {
  constructor(private readonly rules: TrustScoreRulesService) {}

  @Get()
  list() {
    return this.rules.list();
  }

  @Post()
  create(@Body() dto: CreateTrustScoreRuleDto) {
    return this.rules.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrustScoreRuleDto) {
    return this.rules.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rules.remove(id);
  }
}
