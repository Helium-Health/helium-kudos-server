import {
  IsNumber,
  IsString,
  IsPositive,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { Types } from 'mongoose';

export class AllocateCoinsDto {
  @IsString()
  userId: Types.ObjectId;

  @IsNumber()
  @IsPositive()
  allocation: number;
}
export class AllocateCoinsToUsersDto {
  @IsNumber()
  @IsPositive()
  allocation: number;

  @IsArray()
  @IsMongoId({ each: true })
  userIds: Types.ObjectId[];
}
export class SendCoinsDto {
  @IsString()
  fromUserEmail: string;

  @IsString()
  toUserEmail: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
