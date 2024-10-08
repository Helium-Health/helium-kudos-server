import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Currency extends Document {
  @Prop({ required: true, unique: true })
  currency: string;

  @Prop({ required: true })
  rate: number;
}
export const CurrencySchema = SchemaFactory.createForClass(Currency);
