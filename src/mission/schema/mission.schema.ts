import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MissionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
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

  @Prop({
    required: true,
  })
  status: MissionStatus;
}

export const MissionSchema = SchemaFactory.createForClass(Mission);

export type MissionDocument = Document & Mission;
