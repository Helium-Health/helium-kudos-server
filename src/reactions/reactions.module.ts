import { forwardRef, Module } from '@nestjs/common';
import { ReactionService } from './reactions.service';
import { ReactionsController } from './reactions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Reaction, ReactionSchema } from './schema/reactions.schema';
import { RecognitionModule } from 'src/recognition/recognition.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => RecognitionModule),
    MongooseModule.forFeature([
      { name: Reaction.name, schema: ReactionSchema },
    ]),
  ],
  controllers: [ReactionsController],
  providers: [ReactionService],
  exports: [ReactionService],
})
export class ReactionsModule {}
