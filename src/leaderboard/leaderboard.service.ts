import { Injectable, Query } from '@nestjs/common';
import { RecognitionService } from 'src/recognition/recognition.service';
import { TransactionService } from 'src/transaction/transaction.service';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly recognitionService: RecognitionService,
    private readonly transactionService: TransactionService,
  ) {}

  async topUsers(year, filterBy, month) {
    return this.recognitionService.topUsers(year, filterBy, month);
  }

  async getUncreditedUsers() {
    return this.transactionService.findUncreditedUsers();
  }

  async getTopRecognitionReceivers(page: number, limit: number, startDate: Date, endDate: Date) {
    return this.recognitionService.getTopRecognitionReceivers(page, limit, startDate, endDate);
  }

  async getTopRecognitionSenders(page: number, limit: number, startDate: Date, endDate: Date) {
    return this.recognitionService.getTopRecognitionSenders(page, limit, startDate, endDate);
  }
  async getQuarterParticipants(
    page: number,
    limit: number,
    year: number,
    quarter: number,
  ) {
    return this.recognitionService.getQuarterParticipants(
      page,
      limit,
      year,
      quarter,
    );
  }

  async getYearlyStatisticsWithMonthlyDetails(year: number) {
    return this.recognitionService.getYearlyStatisticsWithMonthlyDetails(year);
  }
}
