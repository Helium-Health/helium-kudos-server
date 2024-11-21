import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  coins?: number;

  @IsEnum(['BIRTHDAY', 'WORK_ANNIVERSARY'])
  type: string;
}
