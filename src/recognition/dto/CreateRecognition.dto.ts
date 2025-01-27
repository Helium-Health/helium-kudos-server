import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  Matches,
  IsUrl,
  ArrayMaxSize,
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
  @IsArray()
  @ArrayMaxSize(5)
  @Transform(({ value }) =>
    Array.isArray(value) ? value.filter(Boolean) : value,
  )
  @Matches(/^https:\/\/(?:media\d*\.)?giphy\.com\/media\/.+\.(gif|mp4)$/, {
    each: true,
    message: 'Invalid Giphy URL',
  })
  @IsUrl({}, { each: true })
  giphyUrl?: string[];
}

export class EditRecognitionDto {
  @IsNotEmpty()
  @IsString()
  message: string;
}
