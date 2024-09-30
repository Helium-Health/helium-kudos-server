import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Document & Transaction;

@Schema({ timestamps: true }) // Automatically adds createdAt and updatedAt timestamps
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId; // Reference to the sender's User document

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId; // Reference to the receiver's User document

  @Prop({ type: Number, required: true })
  amount: number; // Amount for the transaction

  @Prop({
    type: String,
    required: true,
    enum: ['increment', 'decrement'], // Restrict to specific transaction types
  })
  type: string; // Type of transaction, either 'increment' or 'decrement'

  @Prop({ type: Date, default: Date.now })
  timestamp: Date; // The date and time of the transaction
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
