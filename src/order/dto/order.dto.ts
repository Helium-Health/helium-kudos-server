import {
  IsNotEmpty,
  IsArray,
  IsMongoId,
  IsNumber,
  ValidateNested,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductVariantDto {
  @IsNotEmpty()
  @IsString()
  variantType: string;

  @IsNotEmpty()
  @IsString()
  value: string;
}

export class ProductDataDto {
  @IsNotEmpty()
  @IsMongoId() // Ensures the productId is a valid MongoDB ObjectId
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDataDto)
  productData: ProductDataDto[];
}
