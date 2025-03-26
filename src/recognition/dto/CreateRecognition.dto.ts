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
  IsInt,
} from 'class-validator';
import { CompanyValues } from 'src/constants/companyValues';

class Receiver {
  @IsNotEmpty()
  @IsString()
  receiverId: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  coinAmount: number;
}

class MediaDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsNotEmpty()
  @IsEnum(['image', 'video'], {
    message: 'Media type must be either image or video',
  })
  type: 'image' | 'video';
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
    Array.isArray(value)
      ? value.filter((url) => typeof url === 'string' && url.trim() !== '')
      : value,
  )
  @Matches(/^https:\/\/(?:media\d*\.)?giphy\.com\/media\/.+\.(gif|mp4)$/, {
    each: true,
    message: 'Invalid Giphy URL',
  })
  @IsUrl({}, { each: true })
  giphyUrl?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media?: MediaDto[];
}

export class EditRecognitionDto {
  @IsNotEmpty()
  @IsString()
  message: string;
}
