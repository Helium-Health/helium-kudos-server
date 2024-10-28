import { Module } from '@nestjs/common';
import { ReactionService } from './reactions.service';
import { ReactionsController } from './reactions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Reaction, ReactionSchema } from './schema/reactions.schema';
import { UserRecognitionModule } from 'src/user-recognition/user-recognition.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { RecognitionModule } from 'src/recognition/recognition.module';
import { UsersModule } from 'src/users/users.module';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [
    UserRecognitionModule,
    WalletModule,
    RecognitionModule,
    UsersModule,
    TransactionModule,
    MongooseModule.forFeature([
      { name: Reaction.name, schema: ReactionSchema },
    ]),
  ],
  controllers: [ReactionsController],
  providers: [ReactionService],
})
export class ReactionsModule {}
