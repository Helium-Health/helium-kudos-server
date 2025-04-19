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


export enum UserStatus{
  Active = 'active',
  Inactive = 'inactive',
  Invited = 'invited',
}

export enum UserTeam {
  Engineering = 'Engineering',
  Executives = 'Executives',
  ProjectManagement = 'Project Management',
  HeliumCredit = 'Helium Credit',
  TechSupportT1 = 'Tech Support (T1)',
  TechSupportT2 = 'Tech Support (T2)',
  FinanceInvestorRelations = 'Finance & Investor Relations',
  Admin = 'Admin',
  HumanResources = 'Human Resources',
  ProductManagement = 'Product Management',
  GrowthExpansion = 'Growth & Expansion',
  HeliumOS = 'HeliumOS',
  Legal = 'Legal',
  Data = 'Data',
  MedicalOperations = 'Medical Operations',
  HeliumDoc = 'HeliumDoc',
  Marketing = 'Marketing',
  DesignOrganization = 'Design (Organization)',
  Communications = 'Communications',
  CustomerSuccess = 'Customer Success',
  StrategyOperations = 'Strategy and Operations',
  ContactCentre = 'Contact Centre',
  CEOOffice = "CEO's Office",
  ProductDesign = 'Product Design',
  ProductQuality = 'Product Quality',
  PublicHealth = 'Public Health',
  Finance = 'Finance',
  CFOSOffice = "CFO's Office",
  COOSOffice = "COO's Office",
  ExecutiveOffice = 'Executive Office',
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

  @Prop({ type: Boolean, default: true })
  active: boolean;

  @Prop({ type: String })
  originalEmail: string;
}

// Create schema using the class
export const UserSchema = SchemaFactory.createForClass(User);
