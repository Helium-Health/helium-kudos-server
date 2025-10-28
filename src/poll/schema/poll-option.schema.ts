import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type PollOptionDocument = Document &
  PollOption & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class PollOption {
  @Prop({ type: Types.ObjectId, ref: 'Poll', required: true, index: true })
  pollId: Types.ObjectId;

  @Prop({ type: String, required: true })
  optionText: string;

  @Prop({ default: 0 })
  votesCount: number;

  @Prop({ type: Number, required: true })
  position: number;
}

export const PollOptionSchema = SchemaFactory.createForClass(PollOption);
PollOptionSchema.index({ pollId: 1, position: 1 });
