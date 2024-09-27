import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Document & Wallet;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Reference to User entity

  @Prop({ type: Number, required: true, default: 0 })
  earnedCoins: number;

  @Prop({ type: Number, required: true, default: 0 })
  coinsAvailable: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
