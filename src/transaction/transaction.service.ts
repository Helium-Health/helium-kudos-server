import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  EntityType,
  transactionStatus,
  Transaction,
  TransactionType,
  TransactionDocument,
} from 'src/schemas/Transaction.schema';
import { RecordTransactionDto } from './dto/Transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  async recordDebitTransaction(
    transaction: RecordTransactionDto,
    session: ClientSession,
  ) {
    try {
      const debitTransaction = new this.transactionModel({
        userId: transaction.senderId,
        amount: -transaction.amount,
        type: TransactionType.DEBIT,
        entityType: transaction.entityType,
        entityId: transaction.entityId,
        relatedUserId: transaction.receiverId,
        status: transactionStatus.SUCCESS,
        claimId: transaction.claimId,
      });

      await debitTransaction.save({ session });
    } catch (error) {
      console.error('Error processing debit transaction:', error);
      throw new InternalServerErrorException(
        'Failed to process debit transaction',
      );
    }
  }

  async getTransactionsByRecognition(recognitionId: Types.ObjectId) {
    return this.transactionModel
      .find({
        entityType: EntityType.RECOGNITION,
        entityId: recognitionId,
      })
      .populate('userId', 'name');
  }

  async recordCreditTransaction(
    transaction: RecordTransactionDto,
    session: ClientSession,
  ) {
    try {
      const creditTransaction = new this.transactionModel({
        userId: transaction.receiverId,
        amount: transaction.amount,
        type: TransactionType.CREDIT,
        entityType: transaction.entityType,
        entityId: transaction.entityId,
        relatedUserId: transaction.senderId,
        status: transaction.status,
        claimId: transaction.claimId,
      });

      await creditTransaction.save({ session });
    } catch (error) {
      console.error('Error processing credit transaction:', error);

      throw new InternalServerErrorException(
        'Failed to process credit transaction',
      );
    }
  }

  async findTransactionByClaimId(
    claimId: Types.ObjectId,
    transactionType: TransactionType,
    session: ClientSession,
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel
      .findOne({ claimId: claimId, type: transactionType })
      .session(session);

    if (!transaction) {
      throw new NotFoundException(
        `Associated ${transactionType} transaction not found`,
      );
    }

    return transaction;
  }
}
