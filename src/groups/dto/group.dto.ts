import { IsOptional, IsString, IsArray, IsMongoId } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  members?: string[];
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  members?: string[];
}
