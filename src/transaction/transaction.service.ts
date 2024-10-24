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

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  async recordDebitTransaction(
    transaction: {
      senderId: Types.ObjectId;
      receiverId: Types.ObjectId;
      amount: number;
      entityId: Types.ObjectId;
      entityType: EntityType;
      claimId: Types.ObjectId;
    },
    session: ClientSession,
  ): Promise<Types.ObjectId> {
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

    const savedTransaction = await debitTransaction.save({ session });

    return savedTransaction._id;
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
    transaction: {
      senderId: Types.ObjectId;
      receiverId: Types.ObjectId;
      amount: number;
      entityId: Types.ObjectId;
      entityType: EntityType;
      claimId: Types.ObjectId;
    },
    session: ClientSession,
  ) {
    try {
      // Log credit transaction.
      const creditTransaction = new this.transactionModel({
        userId: transaction.receiverId,
        amount: transaction.amount,
        type: TransactionType.CREDIT,
        entityType: transaction.entityType,
        entityId: transaction.entityId,
        relatedUserId: transaction.senderId,
        status: transactionStatus.SUCCESS,
        claimId: transaction.claimId,
      });

      await creditTransaction.save({ session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
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
