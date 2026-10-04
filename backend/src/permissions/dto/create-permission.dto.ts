import { IsString, MaxLength, MinLength } from 'class-validator';

// P7-06 — ghi chú quyền hạn theo vai trò, hiển thị tham khảo ở CMS RBAC
// (SCR-12). KHÔNG dùng để enforce access — enforcement thật vẫn qua
// @Roles()/RolesGuard theo 4 role cố định (USER/MODERATOR/ADMIN/ROOT_ADMIN).
export class CreatePermissionDto {
  @IsString({ message: 'roleName phải là chuỗi' })
  @MinLength(2, { message: 'roleName phải có ít nhất 2 ký tự' })
  @MaxLength(50, { message: 'roleName tối đa 50 ký tự' })
  roleName!: string;

  @IsString({ message: 'permissionCode phải là chuỗi' })
  @MinLength(2, { message: 'permissionCode phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'permissionCode tối đa 100 ký tự' })
  permissionCode!: string;
}
