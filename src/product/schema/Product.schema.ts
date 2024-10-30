import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Document & Product;

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: Number, required: true })
  quantity: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
