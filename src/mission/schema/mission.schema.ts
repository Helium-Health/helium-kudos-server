import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MissionStatus {
  UPCOMING = 'pending',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

export class Winners {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  winnerId: Types.ObjectId;

  @Prop({ default: 0, required: true })
  points: number;

  @Prop({ required: true })
  rank: number;

  @Prop({ default: 0, required: true })
  coinAmount: number;
}
@Schema()
export class Participants {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  participantId: Types.ObjectId;

  @Prop({ default: 0, required: true })
  points: number;

  @Prop({ required: true })
  rank: number;
}

@Schema()
export class Mission {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  authorId: Types.ObjectId;
  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ required: true, type: Date })
  endDate: Date;

  @Prop({ required: true })
  pointValue: number;

  @Prop({ required: true })
  maxParticipants: number;

  @Prop({ type: [Participants], default: [] })
  participants: Participants[];

  @Prop({ type: [Winners], default: [] })
  winners: Winners[];

  @Prop({
    required: true,
  })
  status: MissionStatus;
}

export const MissionSchema = SchemaFactory.createForClass(Mission);

export type MissionDocument = Document & Mission;
