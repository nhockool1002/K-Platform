import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CommonModule } from './common/common.module.js';
import { CampaignsModule } from './campaigns/campaigns.module.js';
import { PaymentsModule } from './payments/payments.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
