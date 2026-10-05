import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

// Redis dùng cho rate-limit. Khi Redis không sẵn sàng thì bỏ qua giới hạn (fail-open)
// để không chặn toàn bộ đăng nhập; sự kiện được ghi log cảnh báo.
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: false,
  });

  constructor() {
    this.client.on('error', (err: Error) => this.logger.warn(`Redis lỗi: ${err.message}`));
  }

  // Tăng bộ đếm trong cửa sổ `windowSec` giây; trả về số lần hiện tại, hoặc null nếu Redis lỗi.
  async hit(key: string, windowSec: number): Promise<number | null> {
    try {
      const count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, windowSec);
      return count;
    } catch {
      this.logger.warn('Redis không sẵn sàng — bỏ qua rate-limit cho request này');
      return null;
    }
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined);
  }
}
