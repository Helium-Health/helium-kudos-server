import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Wallet extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  earnedCoins: number;

  @Prop({ required: true, default: 0, type: Number })
  coinsAvailable: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
