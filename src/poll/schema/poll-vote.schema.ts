import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type PollVoteDocument = Document & PollVote & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class PollVote {
  @Prop({ type: Types.ObjectId, ref: 'Poll', required: true, index: true })
  pollId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'PollOption',
    required: true,
    index: true,
  })
  optionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;
}

export const PollVoteSchema = SchemaFactory.createForClass(PollVote);

PollVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });
PollVoteSchema.index({ pollId: 1, optionId: 1 });
