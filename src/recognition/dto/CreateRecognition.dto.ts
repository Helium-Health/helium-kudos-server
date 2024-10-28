import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { CompanyValues } from 'src/constants/companyValues';

export class CreateRecognitionDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsArray()
  @ArrayNotEmpty()
  receiverIds: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(CompanyValues, { each: true })
  companyValues?: CompanyValues[];

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Coin amount must be a non-negative number' })
  coinAmount?: number;
}
