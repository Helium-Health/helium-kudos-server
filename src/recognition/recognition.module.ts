import { Module } from '@nestjs/common';
import { RecognitionService } from './recognition.service';
import { RecognitionController } from './recognition.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Recognition, RecognitionSchema } from './schema/Recognition.schema';
import { UserRecognitionModule } from 'src/user-recognition/user-recognition.module';
import { UsersModule } from 'src/users/users.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { TransactionsModule } from 'src/transactions/transactions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recognition.name, schema: RecognitionSchema },
    ]),
    UserRecognitionModule,
    WalletModule,
    UsersModule,
    RecognitionModule,
    TransactionsModule,
  ],
  controllers: [RecognitionController],
  providers: [RecognitionService],
  exports: [RecognitionService],
})
export class RecognitionModule {}
