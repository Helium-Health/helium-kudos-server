import { Module } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { TransactionModule } from 'src/transaction/transaction.module';
import { RecognitionModule } from 'src/recognition/recognition.module';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [TransactionModule, RecognitionModule, WalletModule],
  controllers: [LeaderboardController],

  providers: [LeaderboardService],
})
export class LeaderboardModule {}
