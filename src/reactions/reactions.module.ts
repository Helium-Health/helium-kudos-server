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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRecognition.name, schema: UserRecognitionSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Recognition.name, schema: RecognitionSchema },
      { name: Reaction.name, schema: ReactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [ReactionsController],
  providers: [
    ReactionService,
    UsersService,
    UserRecognitionService,
    RecognitionService,
    WalletService,
    TransactionService,
  ],
})
export class ReactionsModule {}
