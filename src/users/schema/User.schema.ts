import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Define the type for User Document
export type UserDocument = Document & User;

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}
export enum UserGender {
  Male = 'male',
  Female = 'female',
}

@Schema({ timestamps: true }) // Automatically adds createdAt and updatedAt fields
export class User {
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, enum: Object.values(UserGender) })
  gender: UserGender;

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

  @Prop({ type: String, required: false, select: false })
  refreshToken?: string;

  @Prop({ type: Date })
  joinDate: Date;

  @Prop({ type: Date })
  dateOfBirth: Date;

  @Prop({ type: Types.ObjectId, ref: 'Wallet' })
  wallet: Types.Array<Types.ObjectId>;

  @Prop()
  team: string;

  @Prop()
  nationality: string;

  @Prop({type: Boolean, default: true})
  active: boolean;
}

// Create schema using the class
export const UserSchema = SchemaFactory.createForClass(User);
