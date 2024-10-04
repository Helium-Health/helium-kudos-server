import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
// import { PassportModule } from '@nestjs/passport';
import { RecognitionModule } from './recognition/recognition.module';
import { CompanyModule } from './company/company.module';
import { UserRecognitionModule } from './user-recognition/user-recognition.module';
import { WalletModule } from './wallet/wallet.module';
import { CommentModule } from './comment/comment.module';
import { TransactionModule } from './transaction/transaction.module';
import { CurrencyModule } from './currency/currency.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    AuthModule,
    UsersModule,
    RecognitionModule,
    CompanyModule,
    UserRecognitionModule,
    WalletModule,
    CommentModule,
    TransactionModule,
    WalletModule,
    CurrencyModule,
    // PassportModule.register({ session: true }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
