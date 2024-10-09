import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types, Connection } from 'mongoose';
import { Wallet, WalletDocument } from './schema/Wallet.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectConnection() private readonly connection: Connection,
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
    const wallet = await this.findWalletByUserId(userId);

    return {
      earnedBalance: wallet.earnedBalance,
      availableToGive: wallet.giveableBalance,
    };
  }
  async getEarnedCoinBalance(userId: string) {
    const wallet = await this.findWalletByUserId(userId);

    return {
      earnedBalance: wallet.earnedBalance,
    };
  }

  async getAvailableToGive(userId: string) {
    const wallet = await this.findWalletByUserId(userId);
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
    session.startTransaction(); // Start the transaction

    try {
      // Find all wallets
      const wallets = await this.walletModel.find().session(session).exec();

      if (!wallets || wallets.length === 0) {
        this.logger.warn('No wallets found for allocation');
        throw new NotFoundException('No wallets found');
      }

      // Update all wallets using updateMany within the transaction
      const result = await this.walletModel.updateMany(
        {}, // Empty filter to update all wallets
        { $set: { giveableBalance: allocation } }, // Set allocation value
        { session }, // Ensure the update is part of the transaction
      );

      if (result.modifiedCount === 0) {
        this.logger.warn('No wallets were updated');
      } else {
        this.logger.log(
          `Successfully allocated ${allocation} coins to ${result.modifiedCount} wallets.`,
        );
      }

      // Commit the transaction
      await session.commitTransaction();
      this.logger.log('Transaction committed successfully.');

      return result;
    } catch (error) {
      // If an error occurs, abort the transaction
      await session.abortTransaction();
      this.logger.error('Transaction aborted due to an error: ', error.message);
      throw error;
    } finally {
      session.endSession(); // End the session regardless of the outcome
    }
  }

  async allocateCoinsToSpecificUser(
    userId: Types.ObjectId,
    allocation: number,
  ) {
    if (allocation < 0) {
      throw new BadRequestException('Allocation must be a positive number');
    }

    // Start a new session for the transaction
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

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return wallet;
    } catch (error) {
      // Abort the transaction in case of an error
      await session.abortTransaction();
      session.endSession();

      throw error; // Rethrow the error to handle it outside
    }
  }

  async findWalletByUserId(userId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findOne({ userId }).exec();

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for userId: ${userId}`);
    }

    return wallet;
  }
}
