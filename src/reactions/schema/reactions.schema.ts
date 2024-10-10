import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/users/schema/User.schema';

@Schema({ timestamps: true })
export class Reaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: Types.ObjectId, ref: 'Recognition', required: true })
  recognitionId: Types.ObjectId;

  @Prop({ required: true })
  shortcodes: string;
}

export const ReactionSchema = SchemaFactory.createForClass(Reaction);
