import { forwardRef, Module } from '@nestjs/common';
import { PollService } from './poll.service';
import { PollController } from './poll.controller';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Poll, PollSchema } from './schema/poll.schema';
import { RecognitionModule } from 'src/recognition/recognition.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Poll.name, schema: PollSchema }]),
    forwardRef(() => RecognitionModule),
  ],
  providers: [PollService],
  controllers: [PollController],
  exports: [PollService],
})
export class PollModule {}
