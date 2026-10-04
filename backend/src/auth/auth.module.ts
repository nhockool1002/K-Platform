import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { MailModule } from '../mail/mail.module.js';
import { TrustScoreModule } from '../trust-score/trust-score.module.js';

@Module({
  imports: [MailModule, TrustScoreModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
