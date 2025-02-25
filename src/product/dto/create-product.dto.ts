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
  Min,
} from 'class-validator';
import { Types } from 'mongoose';
// export class ProductVariantDto {
//   @IsString()
//   @IsNotEmpty()
//   variantType: string;

//   @IsString()
//   @IsNotEmpty()
//   value: string;

//   @IsNumber()
//   @Min(0, { message: 'Price cannot be negative' })
//   price: number;

//   @IsNumber()
//   @Min(1, { message: 'Stock must be greater than 0' })
//   stock: number;
// }

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
  categories?: Types.ObjectId[];

  // @ValidateIf((product) => !product.basePrice)
  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => ProductVariantDto)
  // variants?: ProductVariantDto[];

  // @ValidateIf((product) => !product.variants || product.variants.length === 0)
  @IsNumber()
  @IsNotEmpty()
  @Min(0, { message: 'Price cannot be negative' })
  basePrice: number;

  @IsNumber()
  @Min(1, { message: 'Stock must be greater than 0' })
  stock: number;
}
