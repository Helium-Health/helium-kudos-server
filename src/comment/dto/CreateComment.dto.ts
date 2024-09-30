import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsMongoId()
  recognitionId: Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  content: string;
}
