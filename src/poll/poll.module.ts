import { forwardRef, Module } from '@nestjs/common';
import { PollService } from './poll.service';
import { PollController } from './poll.controller';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Poll, PollSchema } from './schema/poll.schema';
import { RecognitionModule } from 'src/recognition/recognition.module';
import { PollVote, PollVoteSchema } from './schema/poll-vote.schema';
import { PollOption, PollOptionSchema } from './schema/poll-option.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Poll.name, schema: PollSchema },
      { name: PollOption.name, schema: PollOptionSchema },
      { name: PollVote.name, schema: PollVoteSchema },
    ]),

    forwardRef(() => RecognitionModule),
  ],
  providers: [PollService],
  controllers: [PollController],
  exports: [PollService, MongooseModule],
})
export class PollModule {}
