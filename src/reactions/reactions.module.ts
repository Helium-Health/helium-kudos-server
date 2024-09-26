import { Module } from '@nestjs/common';
import { ReactionService } from './reactions.service';
import { ReactionsController } from './reactions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Recognition,
  RecognitionSchema,
} from 'src/schemas/recognitions.schema';
import { Reaction, ReactionSchema } from 'src/schemas/reactions.schema';
import { User, UserSchema } from 'src/schemas/User.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recognition.name, schema: RecognitionSchema },
      { name: Reaction.name, schema: ReactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ReactionsController],
  providers: [ReactionService],
})
export class ReactionsModule {}
