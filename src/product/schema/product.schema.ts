import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Document & Product;

export interface ProductResponse extends Omit<Product, 'images'> {
  images: string[];
}

@Schema({ timestamps: true })
export class ProductVariant {
  @Prop({ type: String, required: true })
  variantType: string;

  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, required: true })
  stock: number;
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description: string;

  @Prop([String])
  images: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }] })
  categories: Types.ObjectId[];

  @Prop({ type: [ProductVariant], default: [] })
  variants: ProductVariant[];

  @Prop({ type: Number, required: true })
  basePrice: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
