import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';
import { FeedbackCategory } from '../schema/feedback.schema';

export class CreateFeedbackDto {
  @IsEnum(FeedbackCategory, { message: 'Invalid feedback category' })
  category: FeedbackCategory;

  @IsString()
  @IsNotEmpty()
  @Length(5, 100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(10)
  message: string;
}
