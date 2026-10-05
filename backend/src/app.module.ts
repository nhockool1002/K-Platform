import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CommonModule } from './common/common.module.js';
import { CampaignsModule } from './campaigns/campaigns.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SubmissionsModule } from './submissions/submissions.module.js';
import { AccountActivationModule } from './account/account-activation.module.js';
import { DisputesModule } from './disputes/disputes.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { TrustScoreModule } from './trust-score/trust-score.module.js';
import { AuditModule } from './audit/audit.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { SecurityModule } from './security/security.module.js';
import { SecurityHeadersMiddleware } from './security/security-headers.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // P4-04 — kết nối Redis dùng chung cho mọi queue BullMQ (hiện chỉ có
    // "watermark", đăng ký ở WatermarkModule). P4-09 — cron Auto-Approve.
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
      }),
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    PaymentsModule,
    SettingsModule,
    SubmissionsModule,
    AccountActivationModule,
    DisputesModule,
    ReportsModule,
    TrustScoreModule,
    AuditModule,
    RbacModule,
    ProfileModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}
