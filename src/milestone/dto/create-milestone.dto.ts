import { IsString, IsNumber, IsEnum } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsNumber()
  coins: number;

  @IsEnum(['BIRTHDAY', 'WORK_ANNIVERSARY'])
  type: string;
}
