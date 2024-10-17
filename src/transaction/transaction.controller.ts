import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';

@Controller('transaction')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('pending')
  async getPendingTransactions() {
    const pendingTransactions =
      await this.transactionService.getPendingTransactions();
    return pendingTransactions;
  }

  @Patch('approve/:id')
  async approveTransaction(@Param('id') debitTransactionId: string) {
    const transactionId = new Types.ObjectId(debitTransactionId);
    await this.transactionService.approveTransaction(transactionId);
    return { message: 'Transaction approved successfully' };
  }

  @Patch('deny/:id')
  async denyTransaction(@Param('id') debitTransactionId: string) {
    const transactionId = new Types.ObjectId(debitTransactionId);
    await this.transactionService.denyTransaction(transactionId);
    return { message: 'Transaction denied successfully' };
  }
}
