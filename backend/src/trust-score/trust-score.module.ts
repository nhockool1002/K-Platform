import { Module } from '@nestjs/common';
import { TrustScoreRulesController } from './trust-score-rules.controller.js';
import { AdminTrustScoreController } from './admin-trust-score.controller.js';
import { TrustScoreService } from './trust-score.service.js';
import { TrustScoreRulesService } from './trust-score-rules.service.js';
import { TrustScoreStreaksService } from './trust-score-streaks.service.js';

@Module({
  controllers: [TrustScoreRulesController, AdminTrustScoreController],
  providers: [TrustScoreService, TrustScoreRulesService, TrustScoreStreaksService],
  exports: [TrustScoreService],
})
export class TrustScoreModule {}
