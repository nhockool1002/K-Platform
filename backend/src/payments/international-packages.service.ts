import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditActionType, AuditLevel } from '../prisma/client.js';
import type {
  CreateInternationalPackageDto,
  UpdateInternationalPackageDto,
} from './dto/international-package.dto.js';

// Gói mặc định khi bảng còn trống lần đầu (link BMC do chủ dự án tạo sẵn).
// Chỉ seed khi bảng rỗng — Admin xoá gói nào thì không bị tạo lại lúc restart.
const DEFAULT_PACKAGES = [
  {
    name: '$10 KPoint Credits — KPLATFORM',
    amountUsd: '10.00',
    bmcUrl: 'https://buymeacoffee.com/nhutnm/e/583157',
    sortOrder: 10,
  },
  {
    name: '$20 KPoint Credits — KPLATFORM',
    amountUsd: '20.00',
    bmcUrl: 'https://buymeacoffee.com/nhutnm/e/583160',
    sortOrder: 20,
  },
  {
    name: '$50 KPoint Credits — KPLATFORM',
    amountUsd: '50.00',
    bmcUrl: 'https://buymeacoffee.com/nhutnm/e/583161',
    sortOrder: 50,
  },
] as const;

@Injectable()
export class InternationalPackagesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.internationalPackage.count();
    if (count > 0) return;
    await this.prisma.internationalPackage.createMany({ data: [...DEFAULT_PACKAGES] });
  }

  listAll() {
    return this.prisma.internationalPackage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { amountUsd: 'asc' }],
    });
  }

  listActive() {
    return this.prisma.internationalPackage.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { amountUsd: 'asc' }],
    });
  }

  async create(actorId: string, dto: CreateInternationalPackageDto, ip: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const pkg = await tx.internationalPackage.create({
        data: {
          name: dto.name,
          amountUsd: dto.amountUsd,
          bmcUrl: dto.bmcUrl,
          active: dto.active ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          targetResource: `international_package:${pkg.id}`,
          actionType: AuditActionType.CREATE,
          level: AuditLevel.INFO,
          payloadAfter: { name: pkg.name, amountUsd: pkg.amountUsd.toString(), bmcUrl: pkg.bmcUrl },
          ip: ip ?? undefined,
        },
      });
      return pkg;
    });
  }

  async update(actorId: string, id: string, dto: UpdateInternationalPackageDto, ip: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.internationalPackage.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Không tìm thấy gói nạp');

      const after = await tx.internationalPackage.update({
        where: { id },
        data: {
          name: dto.name,
          amountUsd: dto.amountUsd,
          bmcUrl: dto.bmcUrl,
          active: dto.active,
          sortOrder: dto.sortOrder,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          targetResource: `international_package:${id}`,
          actionType: AuditActionType.UPDATE,
          level: AuditLevel.INFO,
          payloadBefore: {
            name: before.name,
            amountUsd: before.amountUsd.toString(),
            bmcUrl: before.bmcUrl,
            active: before.active,
          },
          payloadAfter: {
            name: after.name,
            amountUsd: after.amountUsd.toString(),
            bmcUrl: after.bmcUrl,
            active: after.active,
          },
          ip: ip ?? undefined,
        },
      });
      return after;
    });
  }

  async remove(actorId: string, id: string, ip: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.internationalPackage.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Không tìm thấy gói nạp');

      await tx.internationalPackage.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId,
          targetResource: `international_package:${id}`,
          actionType: AuditActionType.DELETE,
          level: AuditLevel.WARNING,
          payloadBefore: { name: before.name, amountUsd: before.amountUsd.toString() },
          ip: ip ?? undefined,
        },
      });
      return { success: true };
    });
  }
}
