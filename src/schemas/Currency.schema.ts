import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Currency extends Document {
  @Prop({ required: true, unique: true })
  currencyName: string;

  @Prop({ required: true })
  coinToCurrency: number;
}
export const CurrencySchema = SchemaFactory.createForClass(Currency);
