import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecognitionDocument = Document & Recognition;

@Schema({ timestamps: true })
export class Recognition {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  giverId: Types.ObjectId; // Reference to the User entity for the giver

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId; // Reference to the User entity for the receiver

  @Prop({ type: String, required: true })
  message: string;
}

export const RecognitionSchema = SchemaFactory.createForClass(Recognition);
