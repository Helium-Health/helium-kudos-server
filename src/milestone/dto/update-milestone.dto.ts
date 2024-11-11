import { IsString, IsNumber, IsEnum } from 'class-validator';

export class UpdateMilestoneDto {
  @IsString()
  message: string;

  @IsNumber()
  coins: number;
}
