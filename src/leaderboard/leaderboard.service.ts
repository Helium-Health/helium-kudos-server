import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument, TransactionType, EntityType, transactionStatus } from 'src/transaction/schema/Transaction.schema';


@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async getTopGivers() {
    return this.transactionModel.aggregate([
      { $match: { entityType: EntityType.RECOGNITION, type: TransactionType.DEBIT, status: transactionStatus.SUCCESS } },
      { $group: { _id: '$userId', totalGiven: { $sum: '$amount' } } },
      { $sort: { totalGiven: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
    ]);
  }

  async getTopReceivers() {
    return this.transactionModel.aggregate([
      { $match: { entityType: EntityType.RECOGNITION, type: TransactionType.CREDIT, status: transactionStatus.SUCCESS } },
      { $group: { _id: '$relatedUserId', totalReceived: { $sum: '$amount' } } },
      { $sort: { totalReceived: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
    ]);
  }

  async getUncreditedUsers() {
    return this.transactionModel.aggregate([
      {
        $match: {
          entityType: EntityType.RECOGNITION,
          $or: [
            { status: { $ne: transactionStatus.SUCCESS } },
            { relatedUserId: { $exists: false } },
          ],
        },
      },
      { $group: { _id: '$userId', uncreditedAmount: { $sum: '$amount' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
    ]);
  }
}
