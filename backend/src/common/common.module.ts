import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { RootAdminTargetGuard } from './guards/root-admin-target.guard.js';

// Guard RBAC dùng chung (JwtAuthGuard/RolesGuard/RootAdminTargetGuard) cần
// JwtService — đăng ký 1 lần ở đây và export để mọi module feature dùng lại.
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [JwtAuthGuard, RolesGuard, RootAdminTargetGuard],
  exports: [JwtAuthGuard, RolesGuard, RootAdminTargetGuard, JwtModule],
})
export class CommonModule {}
