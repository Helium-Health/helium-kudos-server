import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

class PollDurationDto {
  @IsInt()
  @Min(0)
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
  @ArrayMaxSize(4)
  @ArrayMinSize(2)
  options: string[];

  @ValidateNested()
  @Type(() => PollDurationDto)
  pollDuration: PollDurationDto;
}

export class VotePollDto {
  @IsNotEmpty()
  optionId: string;
}
