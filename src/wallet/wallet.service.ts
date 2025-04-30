import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types, Connection } from 'mongoose';
import { Wallet, WalletDocument } from './schema/Wallet.schema';
import { TransactionService } from 'src/transaction/transaction.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectConnection() private readonly connection: Connection,
    private readonly transactionService: TransactionService,
  ) {}
  private readonly logger = new Logger(WalletService.name);

  private async runTransactionWithRetry<T>(
    fn: (session: ClientSession) => Promise<T>,
    retries = 4,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const session = await this.walletModel.db.startSession();

      try {
        const result = await fn(session);
        return result;
      } catch (error) {
        lastError = error;
        const isWriteConflict = error.message.includes('Write conflict');

        if (!isWriteConflict) throw error;

        await session.abortTransaction();

        this.logger.warn(
          `Write conflict detected. Retrying attempt ${attempt}/${retries}`,
        );

        await new Promise((res) => setTimeout(res, 1000 * attempt)); // backoff
      } finally {
        session.endSession();
      }
    }

    throw lastError;
  }

  async createWallet(userId: Types.ObjectId, session: ClientSession) {
    const newWallet = new this.walletModel({
      userId,
      earnedBalance: 0,
      giveableBalance: 0,
    });
    return newWallet.save({ session });
  }

  async incrementEarnedBalance(
    userId: Types.ObjectId,
    amount: number,
    session: ClientSession,
  ) {
    return this.walletModel
      .findOneAndUpdate(
        { userId },
        { $inc: { earnedBalance: amount } },
        { session, new: true, upsert: false },
      )
      .then((result) => {
        if (!result) {
          throw new NotFoundException(`Wallet not found for user ${userId}`);
        }
        return result;
      });
  }

  async incrementGiveableBalance(
    userId: Types.ObjectId,
    amount: number,
    session: ClientSession,
  ) {
    return this.walletModel
      .findOneAndUpdate(
        { userId },
        { $inc: { giveableBalance: amount } },
        { session, new: true, upsert: false },
      )
      .then((result) => {
        if (!result) {
          throw new NotFoundException(`Wallet not found for user ${userId}`);
        }
        return result;
      });
  }

  async hasEnoughCoins(
    userId: Types.ObjectId,
    amount: number,
  ): Promise<boolean> {
    try {
      const wallet = await this.walletModel.findOne({ userId });

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for userId: ${userId}`);
      }

      return wallet.giveableBalance >= amount;
    } catch (error) {
      this.logger.error(
        `Failed to check wallet balance for user: ${userId}`,
        error,
      );
      return false;
    }
  }

  async deductCoins(
    userId: Types.ObjectId,
    amount: number,
    session: ClientSession,
  ) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new BadRequestException('Invalid amount');
    }

    const wallet = await this.walletModel.findOneAndUpdate(
      { userId, giveableBalance: { $gte: amount } },
      { $inc: { giveableBalance: -amount } },
      { new: true, session },
    );

    if (!wallet) {
      throw new BadRequestException('Insufficient balance');
    }

    return wallet;
  }

  async getUserBalances(userId: string) {
    const wallet = await this.findWalletByUserId(new Types.ObjectId(userId));
    const totalCoinSpent =
      await this.transactionService.getUserCoinSpentonOrders(
        new Types.ObjectId(userId),
      );
    return {
      earnedBalance: wallet.earnedBalance,
      availableToGive: wallet.giveableBalance,
      totalcoinSpent: totalCoinSpent,
    };
  }

  async getEarnedCoinBalance(userId: string) {
    const wallet = await this.findWalletByUserId(new Types.ObjectId(userId));
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return {
      earnedBalance: wallet.earnedBalance,
    };
  }

  async getAvailableToGive(userId: string) {
    const wallet = await this.findWalletByUserId(new Types.ObjectId(userId));
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return {
      availableToGive: wallet.giveableBalance,
    };
  }

  async allocateCoinsToAll(allocation: number) {
    if (allocation < 0) {
      this.logger.warn('Invalid allocation: Negative value');
      throw new BadRequestException('Allocation must be a positive number');
    }

    return await this.runTransactionWithRetry(async (session) => {
      session.startTransaction();

      const activeWallets = await this.walletModel
        .aggregate([
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: '$user' },
          { $match: { 'user.active': true } },
          { $project: { _id: 1, userId: '$user._id' } },
        ])
        .session(session);

      const walletIds = activeWallets.map((wallet) => wallet._id);
      const userIds = activeWallets.map((wallet) => wallet.userId);

      if (!walletIds.length) {
        this.logger.warn('No active wallets found');
        throw new NotFoundException('No active wallets found');
      }

      const result = await this.walletModel.updateMany(
        { _id: { $in: walletIds } },
        { $set: { giveableBalance: allocation } },
        { session },
      );

      if (!result.modifiedCount) {
        this.logger.warn('No active Wallets were updated');
      } else {
        this.logger.log(
          `Allocated ${allocation} coins to ${result.modifiedCount} wallets`,
        );
      }

      await session.commitTransaction();
      return { userIds, result };
    });
  }

  async allocateCoinsToSpecificUser(
    userId: Types.ObjectId,
    allocation: number,
  ) {
    if (allocation < 0) {
      throw new BadRequestException('Allocation must be a positive number');
    }

    const session = await this.walletModel.db.startSession();
    session.startTransaction();

    try {
      // Find the wallet of the specific user by their Id within the transaction session
      const wallet = await this.walletModel
        .findOne({ userId: userId })
        .session(session);

      if (!wallet) {
        throw new NotFoundException('Wallet not found for the specified user');
      }

      // Update the wallet balance
      wallet.giveableBalance = allocation;
      await wallet.save({ session });

      await session.commitTransaction();
      session.endSession();

      return wallet;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      throw error;
    }
  }

  async findWalletByUserId(userId: Types.ObjectId): Promise<WalletDocument> {
    const wallet = await this.walletModel.findOne({ userId }).exec();

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for userId: ${userId}`);
    }

    return wallet;
  }

  async deductEarnedBalance(
    userId: Types.ObjectId,
    amount: number,
    session: ClientSession,
  ) {
    return this.walletModel
      .findOneAndUpdate(
        { userId },
        { $inc: { earnedBalance: -amount } },
        { session, new: true },
      )
      .then((result) => {
        if (!result) {
          throw new NotFoundException(`Wallet not found for user ${userId}`);
        }
        return result;
      });
  }

  async refundEarnedBalance(
    userId: Types.ObjectId,
    amount: number,
    session: ClientSession,
  ) {
    return this.walletModel
      .findOneAndUpdate(
        { userId },
        { $inc: { earnedBalance: amount } },
        { session, new: true },
      )
      .then((result) => {
        if (!result) {
          throw new NotFoundException(`Wallet not found for user ${userId}`);
        }
        return result;
      });
  }
  async getCoinUseMetrics(
    page: number = 1,
    limit: number = 10,
    sortBy:
      | 'totalCoinEarned'
      | 'totalCoinBalance'
      | 'totalCoinSpent' = 'totalCoinEarned',
    sortOrder: 'ASCENDING' | 'DESCENDING' = 'DESCENDING',
    startDate?: Date,
    endDate?: Date,
  ) {
    const parsedSortOrder = sortOrder === 'ASCENDING' ? 1 : -1;
    const skip = (page - 1) * limit;
    const now = new Date();
    const isFutureDate = endDate && endDate > now;

    const aggregationPipeline: any[] = [
      {
        $lookup: {
          from: 'transactions',
          let: { userId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$type', 'CREDIT'] },
                    { $eq: ['$entityType', 'recognition'] },
                    { $ne: ['$status', 'reversed'] },
                    ...(startDate && endDate
                      ? [
                          {
                            $and: [
                              { $gte: ['$createdAt', startDate] },
                              { $lte: ['$createdAt', endDate] },
                              { $lte: ['$createdAt', now] },
                            ],
                          },
                        ]
                      : [{ $lte: ['$createdAt', now] }]),
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$userId',
                totalEarned: { $sum: '$amount' },
              },
            },
          ],
          as: 'coinEarnedData',
        },
      },
      {
        $lookup: {
          from: 'transactions',
          let: { userId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$type', 'DEBIT'] },
                    { $eq: ['$entityType', 'recognition'] },
                    ...(startDate && endDate
                      ? [
                          {
                            $and: [
                              { $gte: ['$createdAt', startDate] },
                              { $lte: ['$createdAt', endDate] },
                              { $lte: ['$createdAt', now] },
                            ],
                          },
                        ]
                      : [{ $lte: ['$createdAt', now] }]),
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'transactions',
                let: { claimId: '$claimId', userId: '$userId' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$claimId', '$$claimId'] },
                          { $eq: ['$userId', '$$userId'] },
                          { $eq: ['$type', 'CREDIT'] },
                          { $eq: ['$status', 'reversed'] },
                        ],
                      },
                    },
                  },
                ],
                as: 'reversedTransactions',
              },
            },
            {
              $addFields: {
                isReversed: { $gt: [{ $size: '$reversedTransactions' }, 0] },
              },
            },
            {
              $match: { isReversed: false },
            },
            {
              $group: {
                _id: '$userId',
                totalSpent: { $sum: '$amount' },
              },
            },
          ],
          as: 'coinSpentData',
        },
      },
      {
        $addFields: {
          totalCoinSpent: {
            $ifNull: [{ $arrayElemAt: ['$coinSpentData.totalSpent', 0] }, 0],
          },
          totalCoinEarned: {
            $ifNull: [{ $arrayElemAt: ['$coinEarnedData.totalEarned', 0] }, 0],
          },
          totalCoinBalance: isFutureDate ? 0 : '$giveableBalance',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          totalCoinEarned: 1,
          totalCoinSpent: { $abs: '$totalCoinSpent' },
          totalCoinBalance: 1,
          user: {
            userId: '$user._id',
            email: '$user.email',
            name: '$user.name',
            picture: '$user.picture',
          },
        },
      },
      { $sort: { [sortBy]: parsedSortOrder } },
      { $skip: skip },
      { $limit: limit },
    ];

    const totalCountPipeline: any[] = [{ $count: 'totalCount' }];

    const [data, totalCountResult] = await Promise.all([
      this.walletModel.aggregate(aggregationPipeline).exec(),
      this.walletModel.aggregate(totalCountPipeline).exec(),
    ]);

    const totalCount =
      totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      meta: {
        totalCount,
        totalPages,
        page,
        limit,
      },
    };
  }
}
