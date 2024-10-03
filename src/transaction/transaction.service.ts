import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  EntityType,
  Transaction,
  TransactionType,
} from 'src/schemas/Transaction.schema';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
  ) {}

  async recordTransactions(
    transaction: {
      senderId: Types.ObjectId;
      receiverId: Types.ObjectId;
      amount: number;
      entityId: Types.ObjectId;
      entityType: EntityType;
    },

    session: ClientSession,
  ) {
    const debitTransaction = new this.transactionModel({
      userId: transaction.senderId,
      amount: -transaction.amount,
      type: TransactionType.DEBIT,
      entityType: transaction.entityType,
      entityId: transaction.entityId,
      relatedUserId: transaction.receiverId,
    });

    const creditTransaction = new this.transactionModel({
      userId: transaction.receiverId,
      amount: transaction.amount,
      type: TransactionType.CREDIT,
      entityType: transaction.entityType,
      entityId: transaction.entityId,
      relatedUserId: transaction.senderId,
    });

    await Promise.all([
      debitTransaction.save({ session }),
      creditTransaction.save({ session }),
    ]);
  }

  async getTransactionsByRecognition(recognitionId: Types.ObjectId) {
    return this.transactionModel
      .find({
        entityType: EntityType.RECOGNITION,
        entityId: recognitionId,
      })
      .populate('userId', 'name');
  }
}
