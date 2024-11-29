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
export class Receiver {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.Decimal128, required: true })
  amount: number;
}

const ReceiverSchema = SchemaFactory.createForClass(Receiver);

@Schema({ timestamps: true })
export class Claim {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: [ReceiverSchema], required: true })
  receivers: Receiver[];

  @Prop({ type: Types.ObjectId, ref: 'Recognition', required: true })
  recognitionId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Status,
  })
  status: Status;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);
