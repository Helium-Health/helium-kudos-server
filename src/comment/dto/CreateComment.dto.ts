import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  Matches,
  IsUrl,
  IsArray,
  ArrayMaxSize,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';

class MediaDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsNotEmpty()
  @IsEnum(['image', 'video', 'giphy'], {
    message: 'Media type must be either image, video, or giphy',
  })
  type: 'image' | 'video' | 'giphy';
}

export class CreateCommentDto {
  @IsNotEmpty()
  @IsMongoId()
  recognitionId: Types.ObjectId;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media?: MediaDto[];
}

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media?: MediaDto[];

}
