import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CompanyValues } from 'src/constants/companyValues';
import { MilestoneType } from 'src/milestone/schema/Milestone.schema';

export type RecognitionDocument = Document & Recognition;

@Schema({ timestamps: true })
export class Recognition {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  senderId: Types.ObjectId; // Reference to the User entity for the sender

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Number, default: 0 })
  coinAmount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Comment' }] })
  comments: Types.ObjectId[];

  @Prop({ type: [String], enum: CompanyValues, default: [] })
  companyValues: CompanyValues[];

  @Prop({ type: String, enum: MilestoneType, required: false })
  milestoneType?: MilestoneType;

  @Prop({ type: Boolean, default: false })
  isAuto: boolean; // Flag to indicate if recognition is auto-generated

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Reaction' }] })
  reactions: Types.ObjectId[];
}

export const RecognitionSchema = SchemaFactory.createForClass(Recognition);
