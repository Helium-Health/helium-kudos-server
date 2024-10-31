import {
  IsMongoId,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';

export class VariantDto {
  @IsOptional()
  @IsEnum(['S', 'M', 'L', 'XL'])
  size?: string;

  @IsOptional()
  @IsEnum(['Red', 'Blue', 'Green', 'Black'])
  color?: string;
}

export class PlaceOrderDto {
  @IsMongoId()
  productId: Types.ObjectId;

  @IsInt()
  @IsOptional()
  @Min(1)
  quantity?: number = 1;

  @IsOptional()
  @ValidateNested()
  @Type(() => VariantDto)
  variant?: VariantDto;
}
export class PlaceOrderRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceOrderDto)
  items: PlaceOrderDto[];
}
