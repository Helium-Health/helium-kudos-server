import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from 'src/users/schema/User.schema';
export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsBoolean()
  verified: boolean;

  @IsString()
  @IsOptional()
  picture?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  recognitions?: undefined;

  @IsOptional()
  milestones?: undefined;

  @IsOptional()
  coins?: undefined;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

export class UpdateUserRoleDto extends PartialType(CreateUserDto) {
  @IsEnum(UserRole)
  role: UserRole;
}
