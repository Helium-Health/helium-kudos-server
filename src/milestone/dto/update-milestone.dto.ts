import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Cadence } from 'src/constants';

export class UpdateMilestoneDto {
  @IsString()
  message: string;

  @IsNumber()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  coins?: number;

 
}
