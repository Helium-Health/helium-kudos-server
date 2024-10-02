import { Module } from '@nestjs/common';
import { RecognitionService } from './recognition.service';
import { RecognitionController } from './recognition.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRecognitionModule } from 'src/user-recognition/user-recognition.module';
import { UsersModule } from 'src/users/users.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { RecognitionSchema, Recognition } from './schema/Recognition.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recognition.name, schema: RecognitionSchema },
    ]),
    UserRecognitionModule,
    WalletModule,
    UsersModule,
  ],
  controllers: [RecognitionController],
  providers: [RecognitionService],
  exports: [RecognitionService],
})
export class RecognitionModule {}
