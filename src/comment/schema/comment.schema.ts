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

  @Prop({ type: [String], required: false })
  giphyUrl?: string[];

  @Prop({
    type: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ['image', 'video', 'giphy'],
          required: true,
        },
      },
    ],
    default: [],
  })
  media: { url: string; type: 'image' | 'video' | 'giphy' }[];
  @Prop({ type: Boolean, default: null })
  isEdited: string | null;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
