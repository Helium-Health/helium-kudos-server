import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  Min,
  ValidateNested,
  IsBoolean,
} from 'class-validator';

class PollDurationDto {
  @IsInt()
  @Min(1)
  days: number;

  @IsInt()
  @Min(0)
  hours: number;

  @IsInt()
  @Min(0)
  minutes: number;
}

export class CreatePollDto {
  @IsNotEmpty()
  question: string;

  @IsArray()
  @ArrayMaxSize(20)
  @ArrayMinSize(2)
  options: string[];

  @IsBoolean()
  hide: boolean;

  @ValidateNested()
  @Type(() => PollDurationDto)
  pollDuration: PollDurationDto;
}

export class VotePollDto {
  @IsNotEmpty()
  optionId: string;
}
