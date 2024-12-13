import {
  IsNotEmpty,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

class ReceiverDto {
  @IsMongoId()
  @IsNotEmpty()
  receiverId: Types.ObjectId;

  @IsNotEmpty()
  amount: number;
}

export class ClaimDto {
  @IsMongoId()
  @IsNotEmpty()
  senderId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  recognitionId: Types.ObjectId;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiverDto)
  receivers: ReceiverDto[];

  @IsNumber()
  totalCoinAmount: number;
}
