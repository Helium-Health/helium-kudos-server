import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Document & Order;

export enum OrderStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  DELIVERED = 'delivered',
  REJECTED = 'rejected',
  CANCELED = 'canceled',
}

@Schema({ timestamps: true })
export class OrderItemVariant {
  @Prop({ type: String, required: true })
  variantType: string;

  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: Number })
  price: number;
}

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: [OrderItemVariant], default: [] })
  variants: OrderItemVariant[];
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.NEW })
  status: OrderStatus;

  @Prop({ type: Date, default: null })
  expectedDeliveryDate: Date;

  @Prop({ type: Date, default: null })
  deliveredAt: Date;

  @Prop({ type: Types.ObjectId, default: null, ref: 'User' })
  deliveredBy: Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
