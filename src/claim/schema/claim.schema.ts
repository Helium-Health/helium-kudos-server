import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';

export type ClaimDocument = Claim & Document;

export enum Status {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
@Schema({ timestamps: true })
export class Claim {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  recognitionId: string;

  @Prop({ type: mongoose.Schema.Types.Decimal128, required: true })
  amount: number;

  @Prop({
    type: String,
    required: true,
    enum: Status,
  })
  status: Status;

  @Prop({ type: Boolean, required: true })
  approved: boolean;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);
