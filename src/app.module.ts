import { Module } from '@nestjs/common';
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
import { AllocationsModule } from './allocations/allocations.module';
import { ReactionsModule } from './reactions/reactions.module';
import { MilestoneModule } from './milestone/milestone.module';
import { ClaimModule } from './claim/claim.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { StorageModule } from './storage/storage.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

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
    // PassportModule.register({ session: true }),
    ScheduleModule.forRoot(),
    AllocationsModule,
    CurrencyModule,
    ReactionsModule,
    MilestoneModule,
    ClaimModule,
    ProductModule,
    OrderModule,
    StorageModule,
    LeaderboardModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
