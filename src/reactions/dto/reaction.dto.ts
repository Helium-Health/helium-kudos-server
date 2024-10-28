import { IsString, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class ReactionDto {
  @IsNotEmpty()
  recognitionId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  shortcodes: string;
}
