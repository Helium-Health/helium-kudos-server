import { IsNotEmpty, IsMongoId, IsNumber } from 'class-validator';
import { Types } from 'mongoose';

export class CreateTransactionDto {
  @IsMongoId()
  @IsNotEmpty()
  senderId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  receiverId: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
export class UpdateTransactionDto {}
