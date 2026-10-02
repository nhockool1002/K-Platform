import { IsIn } from 'class-validator';

export class ApplicantActionDto {
  @IsIn(['INVITE', 'REJECT'], { message: 'action chỉ nhận INVITE hoặc REJECT' })
  action!: 'INVITE' | 'REJECT';
}
