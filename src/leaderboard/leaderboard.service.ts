import { Injectable, Query } from '@nestjs/common';
import { RecognitionService } from 'src/recognition/recognition.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly recognitionService: RecognitionService,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
  ) {}

  async topUsers(year, filterBy, month) {
    return this.recognitionService.topUsers(year, filterBy, month);
  }

  async getTopRecognitionReceivers(
    page: number,
    limit: number,
    startDate: Date,
    endDate: Date,
  ) {
    return this.recognitionService.getTopRecognitionReceivers(
      page,
      limit,
      startDate,
      endDate,
    );
  }

  async totalCoinAndRecognitionGiven(startDate: Date, endDate: Date) {
    return this.recognitionService.getTotalCoinAndRecognition(
      startDate,
      endDate,
    );
  }

  async getTopRecognitionSenders(
    page: number,
    limit: number,
    startDate: Date,
    endDate: Date,
  ) {
    return this.recognitionService.getTopRecognitionSenders(
      page,
      limit,
      startDate,
      endDate,
    );
  }

  async getCoinUseMetrics(
    page: number,
    limit: number,
    sortBy: 'totalCoinEarned' | 'totalCoinBalance' | 'totalCoinSpent',
    sortOrder: 'ASCENDING' | 'DESCENDING',
  ) {
    return this.walletService.getCoinUseMetrics(page, limit, sortBy, sortOrder);
  }

  async getCompanyValueAnalytics(startDate: Date, endDate: Date) {
    return this.recognitionService.getCompanyValueAnalytics(startDate, endDate);
  }

  async getYearlyStatisticsWithMonthlyDetails(year: number) {
    return this.recognitionService.getYearlyStatisticsWithMonthlyDetails(year);
  }

  async cumulativePostMetrics(parsedStartDate: Date, parsedEndDate: Date) {
    return this.recognitionService.getPostMetrics(
      parsedStartDate,
      parsedEndDate,
    );
  }
}
