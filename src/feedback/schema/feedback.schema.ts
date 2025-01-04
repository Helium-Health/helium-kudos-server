import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedbackDocument = Feedback & Document;

// Exportable Enum for Feedback Categories
export enum FeedbackCategory {
  BUG = 'Bug',
  FEATURE_REQUEST = 'Feature Request',
  GENERAL = 'General',
  ANALYTICS = 'Analytics',
}

@Schema({ timestamps: true })
export class Feedback {
  @Prop({
    required: true,
    enum: Object.values(FeedbackCategory),
    default: FeedbackCategory.GENERAL,
  })
  category: FeedbackCategory;

  @Prop({ required: true, minlength: 5, maxlength: 100 })
  title: string;

  @Prop({ required: true, minlength: 10 })
  message: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  senderId: Types.ObjectId;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
