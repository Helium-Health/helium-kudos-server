import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeaderboardDocument = Leaderboard & Document;

@Schema()
export class Leaderboard {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  points: number;

  @Prop({ required: true })
  rank: number;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const LeaderboardSchema = SchemaFactory.createForClass(Leaderboard);
