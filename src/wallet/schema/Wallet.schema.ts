import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Document & Wallet;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Reference to User entity

  @Prop({ type: Number, required: true, default: 0 })
  earnedBalance: number;

  @Prop({ type: Number, required: true, default: 0 })
  giveableBalance: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
