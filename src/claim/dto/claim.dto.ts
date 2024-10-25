import { IsNotEmpty, IsMongoId, IsNumber, IsArray } from 'class-validator';
import { Types } from 'mongoose';

export class ClaimDto {
  @IsMongoId()
  @IsNotEmpty()
  senderId: Types.ObjectId;

  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  receiverIds: Types.ObjectId[];

  @IsNumber()
  @IsNotEmpty()
  coinAmount: number;

  @IsMongoId()
  @IsNotEmpty()
  recognitionId: Types.ObjectId;
}
