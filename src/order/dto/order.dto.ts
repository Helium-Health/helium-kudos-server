import { IsMongoId, IsOptional, IsInt, Min } from 'class-validator';
import { Types } from 'mongoose';

export class PlaceOrderDto {
  @IsMongoId()
  productId: Types.ObjectId;

  @IsInt()
  @IsOptional()
  @Min(1)
  quantity?: number = 1;
}
