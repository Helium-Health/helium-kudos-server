import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  Matches,
  IsUrl,
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
  @IsString()
  @Matches(/^https:\/\/media\.giphy\.com\/media\/.+\.(gif|mp4)$/, {
    message: 'Invalid Giphy URL',
  })
  @IsUrl()
  giphyUrl?: string;
}
