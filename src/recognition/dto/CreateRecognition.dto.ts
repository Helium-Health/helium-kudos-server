import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { CompanyValues } from 'src/constants/companyValues';

export class CreateRecognitionDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsArray()
  @ArrayNotEmpty()
  receiverIds: string[];

  @IsArray()
  @IsEnum(CompanyValues, { each: true })
  companyValues: CompanyValues[];

  @IsOptional()
  @IsNumber()
  coinAmount?: number;
}
