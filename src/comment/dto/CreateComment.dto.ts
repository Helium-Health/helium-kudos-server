import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  Matches,
  IsUrl,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsMongoId()
  recognitionId: Types.ObjectId;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
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
