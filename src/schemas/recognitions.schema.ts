import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Recognition extends Document {
  @Prop({ required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Number, required: true })
  coinsAmount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Reaction' }] })
  reactions: Types.Array<Types.ObjectId>;
}

export const RecognitionSchema = SchemaFactory.createForClass(Recognition);
