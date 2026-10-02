import { IsIn } from 'class-validator';

export class SwitchModeDto {
  @IsIn(['A', 'B'], { message: 'targetRole chỉ nhận giá trị A hoặc B' })
  targetRole!: 'A' | 'B';
}
