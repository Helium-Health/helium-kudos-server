import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { Cadence } from 'src/constants';

export type AllocationDocument = AllocationRecord & Document;

@Schema({ timestamps: true })
export class AllocationRecord extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone',
    required: true,
  })
  milestoneId: Types.ObjectId;

  @Prop({ required: true })
  allocationDate: Date;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  receiverIds: Types.ObjectId[];

  @Prop({ required: true, type: String, enum: Object.keys(Cadence) })
  type: keyof typeof Cadence;

  @Prop({ required: true })
  status: 'success' | 'failed';
}
export const AllocationRecordSchema =
  SchemaFactory.createForClass(AllocationRecord);
