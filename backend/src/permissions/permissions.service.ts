import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePermissionDto } from './dto/create-permission.dto.js';

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.rolePermission.findMany({
      orderBy: [{ roleName: 'asc' }, { permissionCode: 'asc' }],
    });
  }

  async create(dto: CreatePermissionDto) {
    try {
      return await this.prisma.rolePermission.create({ data: dto });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Quyền hạn này đã được gán cho vai trò này rồi');
      }
      throw err;
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.rolePermission.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy quyền hạn');
    await this.prisma.rolePermission.delete({ where: { id } });
    return { success: true };
  }
}
