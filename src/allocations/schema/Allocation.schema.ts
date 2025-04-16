import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AllocationDocument = Allocation & Document;
export enum AllocationCadence {
  MONTHLY = '0 0 1 * *', // 1st of every month at midnight
  DAILY = '0 0 * * *', // Every day at midnight
}

@Schema()
export class Allocation extends Document {
  @Prop({ required: true })
  allocationName: string;

  @Prop({ required: true })
  allocationAmount: number;

  @Prop({ required: true, enum: AllocationCadence })
  cadence: AllocationCadence;
}

@Schema({ timestamps: true })
export class AllocationRecord extends Document {
  @Prop({ required: true })
  allocationDate: Date;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  receiverIds: Types.ObjectId[];

  @Prop({ required: true, type: String, enum: Object.keys(AllocationCadence) })
  type: keyof typeof AllocationCadence;

  @Prop({ required: true })
  status: 'success' | 'failed';
}
export const AllocationRecordSchema =
  SchemaFactory.createForClass(AllocationRecord);
export const AllocationSchema = SchemaFactory.createForClass(Allocation);
