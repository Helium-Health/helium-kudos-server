import { IsString, IsDate, IsOptional, IsEnum } from 'class-validator';
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

  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @IsString()
  @IsOptional()
  nationality?: string;
}
