import { IsString, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class CreateReactionDto {
  @IsNotEmpty()
  recognitionId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  reactionType: string;

  @IsString()
  @IsNotEmpty()
  shortcodes: string;
}
