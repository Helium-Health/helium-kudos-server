import { IsOptional, IsString, IsEnum } from 'class-validator';
import { DepartmentPermission } from '../schema/department.schema';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  adminId?: string;

  @IsOptional()
  @IsEnum(DepartmentPermission, { each: true })
  permissions?: DepartmentPermission[];
}

export class UpdateDepartmentDto {
    @IsOptional()
    @IsString()
    name?: string;
  
    @IsOptional()
    @IsString()
    description?: string;
  
    @IsOptional()
    @IsString()
    adminId?: string;
  
    @IsOptional()
    @IsEnum(DepartmentPermission, { each: true })
    permissions?: DepartmentPermission[];
  }