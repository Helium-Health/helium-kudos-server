import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Document & Transaction;

export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum EntityType {
  RECOGNITION = 'recognition',
  ORDER = 'order',
  MISSION = 'mission'
}
export enum transactionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  REVERSED = 'reversed',
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

  @Prop({ type: String, enum: transactionStatus, required: true })
  status: transactionStatus;

  @Prop({ type: Types.ObjectId, ref: 'Claim', required: true })
  claimId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ type: Boolean, default: false })
  isAuto: boolean; // Flag to indicate if transaction is auto-generated e.g. auto-generated milestone
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
