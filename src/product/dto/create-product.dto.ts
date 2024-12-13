import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNotEmpty,
  ValidateIf,
  IsMongoId,
} from 'class-validator';
export class ProductVariantDto {
  @IsString()
  @IsNotEmpty()
  variantType: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsNumber()
  price: number;

  @IsNumber()
  stock: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  categories?: string[];

  @ValidateIf((product) => !product.basePrice)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @ValidateIf((product) => !product.variants || product.variants.length === 0)
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;
}
