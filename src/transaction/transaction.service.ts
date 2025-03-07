import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  EntityType,
  TransactionStatus,
  Transaction,
  TransactionType,
  TransactionDocument,
} from 'src/transaction/schema/Transaction.schema';
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
        status: TransactionStatus.SUCCESS,
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

  async recordAutoTransaction(
    transaction: {
      receiverId: Types.ObjectId;
      amount: number;
      entityId: Types.ObjectId;
      entityType: EntityType;
      status: TransactionStatus;
      type: TransactionType;
    },
    session: ClientSession,
  ) {
    const creditTransaction = new this.transactionModel({
      userId: transaction.receiverId,
      amount: transaction.amount,
      status: transaction.status,
      entityType: transaction.entityType,
      entityId: transaction.entityId,
      type: transaction.type,
      isAuto: true,
    });

    return creditTransaction.save({ session });
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

  async findUncreditedUsers() {
    return this.transactionModel.aggregate([
      {
        $match: {
          entityType: EntityType.RECOGNITION,
          $or: [
            { status: { $ne: TransactionStatus.SUCCESS } },
            { relatedUserId: { $exists: false } },
          ],
        },
      },
      { $group: { _id: '$userId', uncreditedAmount: { $sum: '$amount' } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ]);
  }

  async getTotalRecordsForEarnedCoins() {
    return this.transactionModel.countDocuments({
      entityType: EntityType.RECOGNITION,
      type: TransactionType.CREDIT,
      status: TransactionStatus.SUCCESS,
    });
  }

  async getPaginatedUsersWithEarnedCoins(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const totalCount = await this.transactionModel
      .aggregate([
        {
          $match: {
            entityType: EntityType.RECOGNITION,
            type: TransactionType.CREDIT,
            status: TransactionStatus.SUCCESS,
          },
        },
        {
          $group: {
            _id: '$userId',
          },
        },
        {
          $count: 'uniqueUsers',
        },
      ])
      .then((result) => result[0]?.uniqueUsers ?? 0);

    const totalPages = Math.ceil(totalCount / limit);

    const data = await this.transactionModel.aggregate([
      {
        $match: {
          entityType: EntityType.RECOGNITION,
          type: TransactionType.CREDIT,
          status: TransactionStatus.SUCCESS,
        },
      },
      {
        $group: {
          _id: '$userId',
          totalEarnedCoins: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          transactions: {
            $push: {
              entityId: '$entityId',
              coin: '$amount',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $sort: { totalEarnedCoins: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          totalEarnedCoins: 1,
          totalTransactions: 1,
          transactions: 1,
          user: {
            _id: '$user._id',
            email: '$user.email',
            name: '$user.name',
            role: '$user.role',
            picture: '$user.picture',
            verified: '$user.verified',
          },
        },
      },
    ]);

    return {
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
      },
      data,
      status: 200,
      message: 'Success',
    };
  }

  async getUserCoinSpentonOrders(userId: Types.ObjectId): Promise<number> {
    const result = await this.transactionModel.aggregate([
      {
        $match: { entityType: 'order', userId: userId, status: 'success' },
      },
      {
        $group: {
          _id: '$userId',
          netAmount: { $sum: '$amount' },
        },
      },
    ]);

    return result.length > 0 ? Math.abs(result[0].netAmount) : 0;
  }
}
