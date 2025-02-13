import { IsString, IsDate, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { UserGender } from '../schema/User.schema';

export class UpdateUserFromSheetDto {
  @IsString()
  @IsOptional()
  team?: string;

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
