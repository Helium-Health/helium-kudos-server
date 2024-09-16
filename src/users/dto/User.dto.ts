import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from 'src/schemas/User.schema';

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
