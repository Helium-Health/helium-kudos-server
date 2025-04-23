import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsPositive,
  IsNotEmpty,
} from 'class-validator';
import { Milestone, MilestoneType } from '../schema/Milestone.schema';
import { Cadence } from 'src/constants';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  coins?: number;

  @IsEnum([
    MilestoneType.BIRTHDAY,
    MilestoneType.WORK_ANNIVERSARY,
    MilestoneType.INTERNATIONAL_MENS_DAY,
    MilestoneType.INTERNATIONAL_WOMENS_DAY,
    MilestoneType.VALENTINE_DAY,
  ])
  type: MilestoneType;

  @IsOptional()
  @IsNotEmpty()
  @IsEnum(Cadence, {
    message: `cadence must be one of: ${Object.keys(Cadence).join(', ')}`,
  })
  cadence: keyof typeof Cadence;
}
