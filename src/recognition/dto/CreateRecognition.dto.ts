import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  Matches,
  IsUrl,
  ArrayMaxSize,
  IsInt,
  ValidateIf,
} from 'class-validator';
import { CompanyValues } from 'src/constants/companyValues';
import { UserDepartment } from 'src/users/schema/User.schema';
import { MediaType } from '../schema/Recognition.schema';
import { CreatePollDto } from 'src/poll/dto/poll.dto';

class Receiver {
  @IsNotEmpty()
  @IsString()
  receiverId: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  coinAmount: number;
}

class MediaDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsNotEmpty()
  @IsEnum(MediaType, {
    message: 'Media type must be either image, video, or giphy',
  })
  type: MediaType;
}

export class CreateRecognitionDto {
  @ValidateIf((o) => !o.poll)
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Receiver)
  receivers: Receiver[];

  @IsOptional()
  @IsArray()
  @IsEnum(CompanyValues, { each: true })
  companyValues?: CompanyValues[];

  @IsOptional()
  @ValidateIf((_, value) => Object.keys(value || {}).length > 0)
  @ValidateNested()
  @Type(() => CreatePollDto)
  poll?: CreatePollDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media?: MediaDto[];

  @IsOptional()
  @IsArray()
  @IsEnum(UserDepartment, { each: true })
  departments?: UserDepartment[];
}

export class EditRecognitionDto {
  @IsNotEmpty()
  @IsString()
  message: string;
}
