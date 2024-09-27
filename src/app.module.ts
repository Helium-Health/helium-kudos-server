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
import { TransactionsModule } from './transactions/transactions.module';

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
    TransactionsModule,
    // PassportModule.register({ session: true }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
