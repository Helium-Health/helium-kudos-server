import { Module } from '@nestjs/common';
import { ReactionService } from './reactions.service';
import { ReactionsController } from './reactions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Reaction, ReactionSchema } from './schema/reactions.schema';
import { UsersService } from 'src/users/users.service';
import { RecognitionService } from 'src/recognition/recognition.service';
import { User, UserSchema } from 'src/users/schema/User.schema';
import { WalletService } from 'src/wallet/wallet.service';
import {
  Recognition,
  RecognitionSchema,
} from 'src/recognition/schema/Recognition.schema';
import { UserRecognitionService } from 'src/user-recognition/user-recognition.service';
import {
  UserRecognition,
  UserRecognitionSchema,
} from 'src/user-recognition/schema/UserRecognition.schema';
import { Wallet, WalletSchema } from 'src/wallet/schema/Wallet.schema';
import { TransactionService } from 'src/transaction/transaction.service';
import { Transaction, TransactionSchema } from 'src/schemas/Transaction.schema';
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
