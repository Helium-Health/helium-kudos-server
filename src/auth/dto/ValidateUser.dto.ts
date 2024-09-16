import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ValidateUserDto {
  @IsNotEmpty()
  @IsString()
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
}
