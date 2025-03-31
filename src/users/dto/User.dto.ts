import { OmitType } from '@nestjs/mapped-types';
import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Types } from 'mongoose';
import { UserGender, UserRole, UserTeam } from 'src/users/schema/User.schema';
export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
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

  @IsString()
  @IsOptional()
  team?: string;

  @IsDate()
  @IsOptional()
  joinDate?: Date;

  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @IsDate()
  @IsOptional()
  dateOfBirth?: Date;

  @IsOptional()
  recognitions?: undefined;

  @IsOptional()
  milestones?: undefined;

  @IsOptional()
  coins?: undefined;

  @IsString()
  @IsOptional()
  nationality?: string;
}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email']),
) {}
// export class UpdateUserFieldsDto extends OmitType(UpdateUserDto, ['email']) {
//   @IsOptional()
//   @IsDateString()
//   dateOfBirth?: Date;

//   @IsOptional()
//   @IsDateString()
//   joinDate?: Date;
// }

export class UpdateUserRoleDto extends PartialType(CreateUserDto) {
  @IsEnum(UserRole)
  role: UserRole;
}

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @IsOptional()
  @IsString()
  picture?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @IsOptional()
  @IsDateString()
  joinDate?: Date;

  @IsOptional()
  @IsEnum(UserTeam, {
    message: 'Invalid team. Must be one of the predefined values.',
  })
  team?: UserTeam;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  groupId?: Types.ObjectId;
}
