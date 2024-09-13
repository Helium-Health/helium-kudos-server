import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Define the type for User Document
export type UserDocument = Document & User;

@Schema({ timestamps: true }) // Automatically adds createdAt and updatedAt fields
export class User {
  @Prop({ type: String, required: true, unique: true })
  email: string;


  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, enum: ['admin', 'user'], default: 'user' })
  role: string;

  @Prop({ type: Boolean, default: false })
  verified: boolean;

  // Relationships (references to other collections)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Recognition' }] })
  recognitions: Types.Array<Types.ObjectId>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Milestone' }] })
  milestones: Types.Array<Types.ObjectId>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Coin' }] })
  coins: Types.Array<Types.ObjectId>;
}

// Create schema using the class
export const UserSchema = SchemaFactory.createForClass(User);