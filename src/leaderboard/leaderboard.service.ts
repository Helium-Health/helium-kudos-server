import { Injectable, Query } from '@nestjs/common';
import { RecognitionService } from 'src/recognition/recognition.service';
import { TransactionService } from 'src/transaction/transaction.service';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly recognitionService: RecognitionService,
    private readonly transactionService: TransactionService,
  ) {}
  async getTopGivers() {
    return this.transactionService.findTopGivers();
  }

  async getTopReceivers() {
    return this.transactionService.findTopReceivers();
  }

  async getUncreditedUsers() {
    return this.transactionService.findUncreditedUsers();
  }
  async getPaginatedUsersWithEarnedCoins(page: number, limit: number) {
    return this.transactionService.getPaginatedUsersWithEarnedCoins(
      page,
      limit,
    );
  }
  async getTopRecognitionReceivers(page: number, limit: number) {
    return this.recognitionService.getTopRecognitionReceivers(page, limit);
  }

  async getQuarterParticipants(page: number, limit: number) {
    return this.recognitionService.getQuarterParticipants(page, limit);
  }

  async getYearlyStatisticsWithMonthlyDetails(year: number) {
    return this.recognitionService.getYearlyStatisticsWithMonthlyDetails(year);
  }
}
