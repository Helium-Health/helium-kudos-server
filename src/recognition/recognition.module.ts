import { forwardRef, Module } from '@nestjs/common';
import { RecognitionService } from './recognition.service';
import { RecognitionController } from './recognition.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRecognitionModule } from 'src/user-recognition/user-recognition.module';
import { UsersModule } from 'src/users/users.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { RecognitionSchema, Recognition } from './schema/Recognition.schema';
import { ClaimModule } from 'src/claim/claim.module';
import { RecognitionGateway } from './recognition.gateway';
import { SlackModule } from 'src/slack/slack.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recognition.name, schema: RecognitionSchema },
    ]),
    TransactionModule,
    UserRecognitionModule,
    WalletModule,
    forwardRef(() => ClaimModule),
    UsersModule,
    SlackModule,
  ],
  controllers: [RecognitionController],
  providers: [RecognitionService, RecognitionGateway],
  exports: [RecognitionService],
})
export class RecognitionModule {}
