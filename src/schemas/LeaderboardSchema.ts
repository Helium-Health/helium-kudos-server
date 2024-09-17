import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeaderboardDocument = Document & Leaderboard;

@Schema({ timestamps: true })
export class Leaderboard {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Reference to the User entity

  @Prop({ type: Number, required: true })
  points: number;

  @Prop({ type: Number, required: true })
  rank: number;
}

export const LeaderboardSchema = SchemaFactory.createForClass(Leaderboard);
