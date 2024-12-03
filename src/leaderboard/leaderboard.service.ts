import { Injectable } from '@nestjs/common';
import { TransactionService } from 'src/transaction/transaction.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly transactionService: TransactionService) {}
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
}
