import { IsUUID } from 'class-validator';

export class CreateBmcTopupDto {
  @IsUUID('4', { message: 'packageId không hợp lệ' })
  packageId!: string;
}
