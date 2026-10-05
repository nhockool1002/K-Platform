import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';
import { RateLimitGuard } from './rate-limit.js';

@Global()
@Module({
  providers: [RedisService, RateLimitGuard],
  exports: [RedisService, RateLimitGuard],
})
export class SecurityModule {}
