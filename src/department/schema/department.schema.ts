import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DepartmentDocument = Department & Document;

export enum DepartmentPermission {
  MANAGE_USERS = 'manage_users',
  ADD_DEPARTMENT = 'add-department',
  EDIT_DEPARTMENT = 'edit_department',
  DELETE_DEPARTMENT = 'delete_department',
}

@Schema({ timestamps: true })
export class Department {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({
    type: [String],
    enum: DepartmentPermission,
    default: [],
  })
  permissions: DepartmentPermission[];
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
