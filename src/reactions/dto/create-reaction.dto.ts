import { IsString, IsNotEmpty } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @IsNotEmpty()
  recognitionId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  reactionType: string;
}
export class UpdateReactionDto {
  @IsString()
  @IsNotEmpty()
  recognitionId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  reactionType: string;
}
