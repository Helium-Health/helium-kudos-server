import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CompanyValues } from 'src/constants/companyValues';
import { MilestoneType } from 'src/milestone/schema/Milestone.schema';
import { UserDepartment } from 'src/users/schema/User.schema';

export type RecognitionDocument = Document & Recognition;

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIPHY = 'giphy',
}

@Schema({ timestamps: true })
export class Recognition {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  senderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: [String], required: false })
  giphyUrl?: string[]; //TODO: Remove after migration

  @Prop({
    type: [
      {
        receiverId: { type: Types.ObjectId, ref: 'User', required: true },
        coinAmount: { type: Number, required: true, default: 0 },
      },
    ],
    required: true,
  })
  receivers: { receiverId: Types.ObjectId; coinAmount: number }[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Comment' }] })
  comments: Types.ObjectId[];

  @Prop({ type: [String], enum: CompanyValues, default: [] })
  companyValues: CompanyValues[];

  @Prop({ type: String, enum: MilestoneType, required: false })
  milestoneType?: MilestoneType;

  @Prop({ type: Boolean, default: false })
  isAuto: boolean; // Flag to indicate if recognition is auto-generated

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Reaction' }] })
  reactions: Types.ObjectId[];

  @Prop({
    type: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: Object.values(MediaType),
          required: true,
        },
      },
    ],
    default: [],
  })
  media: { url: string; type: MediaType }[];

  @Prop({ type: [String], enum: UserDepartment, default: [] })
  departments: UserDepartment[];

  @Prop({ type: Boolean, default: false, index: true })
  isPinned: boolean;

  @Prop({ type: Date, default: null, index: true })
  pinnedAt: Date | null;
}

export const RecognitionSchema = SchemaFactory.createForClass(Recognition);
