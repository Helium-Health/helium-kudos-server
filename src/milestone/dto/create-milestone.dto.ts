import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { Milestone, MilestoneType } from '../schema/Milestone.schema';

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
}
