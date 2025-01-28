import { IsString, IsDate, IsOptional } from 'class-validator';

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

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  nationality?: string;
}
