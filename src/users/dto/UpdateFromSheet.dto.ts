import {
  IsString,
  IsDate,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { UserDepartment, UserGender } from '../schema/User.schema';

export class UpdateUserFromSheetDto {
  @IsString()
  @IsOptional()
  team?: string;

  @IsOptional()
  @IsEnum(UserDepartment, {
    message: 'Invalid Department. Must be one of the predefined values.',
  })
  department?: UserDepartment;

  @IsDate()
  @IsOptional()
  joinDate?: Date;

  @IsDate()
  @IsOptional()
  dateOfBirth?: Date;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @IsString()
  @IsOptional()
  picture?: string;

  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @IsString()
  @IsOptional()
  nationality?: string;
}
