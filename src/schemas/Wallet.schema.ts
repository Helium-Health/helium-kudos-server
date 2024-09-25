import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Wallet extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, default: 0 })
  earnedBalance: number;

  @Prop({ required: true, default: 0, type: Number })
  availableToGive: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
