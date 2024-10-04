import { IsNumber, IsPositive, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class AllocateCoinsToAllDto {
  @IsNumber()
  @IsPositive()
  allocation: number;
}
export class AllocateCoinsToUserDto {
  @IsNumber()
  @IsPositive()
  allocation: number;

  @IsMongoId({ each: true })
  userId: Types.ObjectId;
}
