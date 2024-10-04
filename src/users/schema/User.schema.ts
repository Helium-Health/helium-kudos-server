import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Define the type for User Document
export type UserDocument = Document & User;

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

@Schema({ timestamps: true }) // Automatically adds createdAt and updatedAt fields
export class User {
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  picture?: string;

  @Prop({
    type: String,
    enum: [UserRole.Admin, UserRole.User],
    default: UserRole.User,
  })
  role: UserRole;

  @Prop({ type: Boolean, default: false })
  verified: boolean;

  @Prop({ type: Date })
  birthday: boolean;
  // Relationships (references to other collections)
  @Prop({ type: Types.ObjectId, ref: 'Wallet' })
  wallet: Types.Array<Types.ObjectId>;
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Recognition' }] })
  recognitions: Types.Array<Types.ObjectId>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Milestone' }] })
  milestones: Types.Array<Types.ObjectId>;
}

// Create schema using the class
export const UserSchema = SchemaFactory.createForClass(User);
