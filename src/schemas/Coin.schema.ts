import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Coin extends Document {
  @Prop({ required: false })
  allocation: number;

  @Prop({ required: false })
  expirationDate: Date;
}

export const CoinSchema = SchemaFactory.createForClass(Coin);
