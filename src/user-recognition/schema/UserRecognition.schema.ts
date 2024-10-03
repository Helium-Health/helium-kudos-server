import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserRecognitionDocument = Document & UserRecognition;

export enum UserRecognitionRole {
  SENDER = 'sender',
  RECEIVER = 'receiver',
}

@Schema({ timestamps: true })
export class UserRecognition {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Recognition', required: true })
  recognitionId: Types.ObjectId;

  @Prop({ type: String, enum: UserRecognitionRole, required: true })
  role: string;
}

export const UserRecognitionSchema =
  SchemaFactory.createForClass(UserRecognition);
