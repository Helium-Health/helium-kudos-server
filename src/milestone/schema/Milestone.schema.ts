import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MilestoneDocument = Document & Milestone;

export enum MilestoneType {
  BIRTHDAY = 'BIRTHDAY',
  WORK_ANNIVERSARY = 'WORK_ANNIVERSARY',
}

@Schema({ timestamps: true })
export class Milestone {
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: Number, default: 0 })
  coins: number;

  @Prop({
    type: String,
    enum: [MilestoneType.BIRTHDAY, MilestoneType.WORK_ANNIVERSARY],
    required: true,
  })
  type: MilestoneType;
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone);
