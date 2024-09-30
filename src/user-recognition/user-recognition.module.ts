import { Module } from '@nestjs/common';
import { UserRecognitionService } from './user-recognition.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserRecognition,
  UserRecognitionSchema,
} from './schema/UserRecognition.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRecognition.name, schema: UserRecognitionSchema },
    ]),
  ],
  providers: [UserRecognitionService],
  exports: [UserRecognitionService],
})
export class UserRecognitionModule {}
