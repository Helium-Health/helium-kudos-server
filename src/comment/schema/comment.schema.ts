import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommentDocument = Document & Comment;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ type: String, ref: 'Recognition', required: true })
  recognitionId: string;

  @Prop({ type: String, required: true })
  content: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
