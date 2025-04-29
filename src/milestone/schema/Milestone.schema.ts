import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Cadence } from 'src/constants';

export type MilestoneDocument = Document & Milestone;

export enum MilestoneType {
  BIRTHDAY = 'BIRTHDAY',
  WORK_ANNIVERSARY = 'WORK_ANNIVERSARY',
  INTERNATIONAL_MENS_DAY = 'INTERNATIONAL_MENS_DAY',
  INTERNATIONAL_WOMENS_DAY = 'INTERNATIONAL_WOMENS_DAY',
  VALENTINE_DAY = 'VALENTINE_DAY',
  INTERNATIONAL_EMPLOYEE_APPRECIATION_DAY = 'INTERNATIONAL_EMPLOYEE_APPRECIATION_DAY',
  MONTHLY_ALLOCATION = 'MONTHLY_ALLOCATION',
}

@Schema({ timestamps: true })
export class Milestone {
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: Number, default: 0 })
  coins: number;

  @Prop({
    type: String,
    enum: Object.values(MilestoneType),
    required: true,
  })
  type: MilestoneType;

  @Prop({ type: Date })
  milestoneDate?: Date;

  @Prop({ type: Boolean, default: false })
  isGeneric: boolean;

  @Prop({ enum: Cadence })
    cadence: Cadence;

}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone);
