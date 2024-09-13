
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MilestoneDocument = Document & Milestone;

@Schema({ timestamps: true })
export class Milestone {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;  // Reference to the User entity

  @Prop({ type: String, required: true, enum: ['work anniversary', 'birthday'] })
  type: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: Number, default: 0 })
  points: number;
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone);