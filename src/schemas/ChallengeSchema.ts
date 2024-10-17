import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChallengeDocument = Document & Challenge;
//
//
//
@Schema({ timestamps: true })
export class Challenge {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Number, required: true })
  points: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId; // Reference to the User entity (admin creator)
}

export const ChallengeSchema = SchemaFactory.createForClass(Challenge);
