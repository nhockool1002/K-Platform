import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// @prisma/client là CommonJS; dưới Node ESM (package.json "type": "module")
// named import không resolve được (xem https://github.com/prisma/prisma/issues/18103).
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
