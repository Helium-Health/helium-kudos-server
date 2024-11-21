import { IsString, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateMilestoneDto {
  @IsString()
  message: string;

  @IsNumber()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  coins?: number;
}
