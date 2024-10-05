import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AllocationDocument = Allocation & Document;

@Schema()
export class Allocation extends Document {
  @Prop({ required: true })
  allocationAmount: number; // Amount to be allocated

  @Prop({ required: true })
  cadence: string; // Cron expression to define the cadence
}

export const AllocationSchema = SchemaFactory.createForClass(Allocation);
