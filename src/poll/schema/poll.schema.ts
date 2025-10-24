import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { validate } from 'class-validator';
import { Types } from 'mongoose';

export type PollDocument = Document & Poll & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class Poll {
  @Prop({ type: Types.ObjectId, ref: 'Recognition', required: true })
  recognitionId: Types.ObjectId;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({
    type: [
      {
        _id: false,
        optionId: { type: String, required: true },
        optionText: { type: String, required: true },
        votes: {
          type: [Types.ObjectId],
          ref: 'User',
          default: [],
        },
      },
    ],
  })
  options: { optionId: string; optionText: string; votes: Types.ObjectId[] }[];

  @Prop({ default: 0 })
  totalVotes: number;

  @Prop({ required: true })
  expiresAt: Date;
}

export const PollSchema = SchemaFactory.createForClass(Poll);
