import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6) // Minimum length for password
  password: string;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Matches(/^[a-zA-Z0-9._%+-]+@(heliumhealth\.com|healiumhealth\.ng)$/, {
    message:
      'Email must be from either heliumhealth.com or healiumhealth.ng domain',
  })
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;
}
