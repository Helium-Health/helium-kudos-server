import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Currency extends Document {
  @Prop({ required: true, default: 100 })
  coinToNaira: number;
}
export const CurrencySchema = SchemaFactory.createForClass(Currency);
