import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RedisService } from './redis.service.js';

export const RATE_LIMIT_KEY = 'rate-limit';

export interface RateLimitOptions {
  limit: number;
  windowSec: number;
  // ip: đếm theo IP; ip+email: đếm theo cặp IP + email trong body (chống dò mật khẩu từng tài khoản).
  by: 'ip' | 'ip+email';
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!opts) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const subject = opts.by === 'ip+email' ? `${req.ip}|${email}` : `${req.ip}`;
    const route = req.route?.path ?? req.path;
    const count = await this.redis.hit(`rl:${route}:${subject}`, opts.windowSec);
    if (count !== null && count > opts.limit) {
      const minutes = Math.ceil(opts.windowSec / 60);
      throw new HttpException(
        `Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
