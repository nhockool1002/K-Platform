import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OverrideEffect, PermissionAction } from '../../prisma/client.js';

export class PermissionEntryDto {
  @IsString()
  resource!: string;

  @IsEnum(PermissionAction)
  action!: PermissionAction;
}

export class CreateGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PermissionEntryDto)
  permissions?: PermissionEntryDto[];
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class SetGroupPermissionsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PermissionEntryDto)
  permissions!: PermissionEntryDto[];
}

export class SetUserGroupsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  groupIds!: string[];
}

export class OverrideEntryDto extends PermissionEntryDto {
  // null = bỏ override, quay về quyền theo nhóm.
  @IsOptional()
  @IsEnum(OverrideEffect)
  effect?: OverrideEffect | null;
}

export class SetUserOverridesDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => OverrideEntryDto)
  overrides!: OverrideEntryDto[];
}

export class ListRbacUsersQuery {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
