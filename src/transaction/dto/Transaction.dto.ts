import { IsNotEmpty, IsNumber, IsMongoId, IsEnum } from 'class-validator';
import { Types } from 'mongoose';
import { EntityType, transactionStatus } from 'src/schemas/Transaction.schema';

export class RecordTransactionDto {
  @IsMongoId()
  @IsNotEmpty()
  senderId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  receiverId: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsMongoId()
  @IsNotEmpty()
  entityId: Types.ObjectId;

  @IsNotEmpty()
  entityType: EntityType;

  @IsMongoId()
  @IsNotEmpty()
  claimId: Types.ObjectId;

  @IsEnum(transactionStatus)
  @IsNotEmpty()
  status: transactionStatus;
}
