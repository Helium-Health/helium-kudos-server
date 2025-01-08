import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsPositive,
  ValidateNested,
  Min,
  Matches,
  IsUrl,
} from 'class-validator';
import { CompanyValues } from 'src/constants/companyValues';

class Receiver {
  @IsNotEmpty()
  @IsString()
  receiverId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coinAmount: number;
}

export class CreateRecognitionDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => Receiver)
  receivers: Receiver[];

  @IsOptional()
  @IsArray()
  @IsEnum(CompanyValues, { each: true })
  companyValues?: CompanyValues[];

  @IsOptional()
  @IsString()
  @Matches(/^https:\/\/media\.giphy\.com\/media\/.+\.(gif|mp4)$/, {
    message: 'Invalid Giphy URL',
  })
  @IsUrl()
  giphyUrl?: string;
}
