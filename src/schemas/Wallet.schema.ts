import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Wallet extends Document {
  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true, default: 0 })
  earnedBalance: number;

  @Prop({ required: true, default: 0, type: Number })
  availableToGive: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Coin' }] }) // Reference to Coin model
  coins: Types.Array<Types.ObjectId>;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
