import { Controller, Get, Param, Patch } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Types } from 'mongoose';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}
  // @Patch(':id/approve')
  // async approveTransaction(@Param('id') id: string) {
  //   const session: ClientSession = await this.transactionService.startSession();
  //   session.startTransaction();
  //   try {
  //     await this.transactionService.approveTransaction(id, session);
  //     await session.commitTransaction();
  //     return { message: 'Transaction approved successfully' };
  //   } catch (error) {
  //     await session.abortTransaction();
  //     throw error;
  //   } finally {
  //     session.endSession();
  //   }
  // }
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
