import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './User.dto';
import { IsOptional, IsDateString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
