import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsDateString,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateMissionDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsNumber()
  pointValue: number;

  @IsNumber()
  maxParticipants: number;

  @IsArray()
  participants: Types.ObjectId[];

  @IsString()
  @IsEnum(['pending', 'active', 'completed', 'canceled'])
  status: string;
}

export class UpdateMissionDto {
  @IsOptional()
  @IsNumber()
  pointValue?: number;

  @IsOptional()
  @IsNumber()
  maxParticipants?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

class ParticipantPointsDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  points: number;
}

export class AssignPointsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantPointsDto)
  participants: ParticipantPointsDto[];
}
