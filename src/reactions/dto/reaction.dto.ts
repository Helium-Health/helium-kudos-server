import { IsString, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class AddReactionDto {
  @IsString()
  @IsNotEmpty()
  recognitionId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  userId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  reactionType: string;
}
export class UpdateReactionDto {
  @IsString()
  @IsNotEmpty()
  recognitionId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  userId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  reactionType: string;
}
