import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Document & Transaction;

export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
  REFUND = 'REFUND',
}

export enum EntityType {
  RECOGNITION = 'recognition',
  ORDER = 'order',
}

export enum Status {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  REFUND = 'refund',
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, enum: TransactionType, required: true })
  type: TransactionType;

  @Prop({ type: String, enum: EntityType, required: true })
  entityType: EntityType;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  relatedUserId?: Types.ObjectId;

  @Prop({ type: String, enum: Status, required: true })
  status: Status;

  @Prop({ type: Boolean, required: true })
  approved: boolean;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
