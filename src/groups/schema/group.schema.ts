import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Group extends Document {
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @Prop({ type: [String], default: [] })
  members: string[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);
