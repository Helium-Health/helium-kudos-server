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

  async refundGiveableBalance(
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
    const wallet = await this.walletModel.findOne({ userId });
    return wallet.giveableBalance >= amount;
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

    return {
      earnedBalance: wallet.earnedBalance,
    };
  }

  async getAvailableToGive(userId: string) {
    const wallet = await this.findWalletByUserId(new Types.ObjectId(userId));
    return {
      availableToGive: wallet.giveableBalance,
    };
  }

  async allocateCoinsToAll(allocation: number) {
    if (allocation < 0) {
      this.logger.warn('Invalid allocation: Negative value');
      throw new BadRequestException('Allocation must be a positive number');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
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
          { $project: { _id: 1 } },
        ])
        .session(session);

      if (!activeWallets || activeWallets.length === 0) {
        this.logger.warn('No activeWallets found for allocation');
        throw new NotFoundException('No activeWallets found');
      }

      
      const result = await this.walletModel.updateMany(
        {},
        { $set: { giveableBalance: allocation } }, 
        { session },
      );

      if (result.modifiedCount === 0) {
        this.logger.warn('No active Wallets were updated');
      } else {
        this.logger.log(
          `Successfully allocated ${allocation} coins to ${result.modifiedCount} activeWallets.`,
        );
      }

      await session.commitTransaction();
      this.logger.log('Transaction committed successfully.');

      return result;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Transaction aborted due to an error: ', error.message);
      throw new Error(error.message);
    } finally {
      session.endSession();
    }
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
}
