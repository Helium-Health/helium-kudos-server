import { IsBoolean, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ValidateUserDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsBoolean()
  verified: boolean;

  @IsNotEmpty()
  @IsString()
  picture: string;

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;
}
