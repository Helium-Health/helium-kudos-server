import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Document & Order;

// Step 1: Define Variant Options
@Schema()
class Variant {
  @Prop({ type: String, required: false, enum: ['S', 'M', 'L', 'XL'] })
  size?: string;

  @Prop({
    type: String,
    required: false,
    enum: ['Red', 'Blue', 'Green', 'Black'],
  })
  color?: string;
}

// Step 2: OrderItem Schema with Variant as an Object
@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Variant, required: false })
  variant?: Variant; // Nested variant object for flexibility
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// Step 3: Order Schema
@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({
    type: String,
    required: true,
    enum: ['draft', 'pending', 'approved', 'purchased', 'canceled', 'failed'],
  })
  status: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
