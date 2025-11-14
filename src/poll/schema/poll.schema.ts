import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type PollDocument = Document & Poll & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class Poll {
  @Prop({
    type: Types.ObjectId,
    ref: 'Recognition',
    required: true,
    index: true,
  })
  recognitionId: Types.ObjectId;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({ type: Boolean, default: false })
  hide: boolean;

  @Prop({ required: true })
  expiresAt: Date;
}
export const PollSchema = SchemaFactory.createForClass(Poll);
