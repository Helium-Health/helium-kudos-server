import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
// import { UpdateCurrencyDto } from 'src/currency/dto/currency.dto';
import { Wallet } from 'src/schemas/wallet.schema';
import { CurrencyService } from 'src/currency/currency.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly currencyService: CurrencyService,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    @InjectConnection() private readonly connection: Connection,
  ) {}
  async createWallet(userEmail: string): Promise<Wallet> {
    if (!userEmail) {
      throw new BadRequestException(
        'User email is required to create a wallet',
      );
    }
    const newWallet = new this.walletModel({
      userEmail, // Link the wallet to the user
      earnedBalance: 0,
      availableToGive: 0,
    });
    return await newWallet.save();
  }
  async getUserBalances(userEmail: string) {
    const wallet = await this.walletModel.findOne({ userEmail });
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }
    return {
      earnedBalance: wallet.earnedBalance,
      availableToGive: wallet.availableToGive,
    };
  }
  async getEarnedCoinBalance(userEmail: string) {
    const wallet = await this.walletModel.findOne({ userEmail });
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }
    return {
      earnedBalance: wallet.earnedBalance,
    };
  }

  async getAvailableToGiveBalance(userEmail: string) {
    const wallet = await this.walletModel.findOne({ userEmail });
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }
    return {
      availableToGive: wallet.availableToGive,
    };
  }
  async allocateCoinsToAll(allocation: number) {
    if (allocation < 0) {
      throw new BadRequestException('Allocation must be a positive number');
    }
    const wallets = await this.walletModel.find();

    if (wallets.length === 0) {
      throw new NotFoundException('No wallets found');
    }
    const updatedWallets = wallets.map((wallet) => {
      wallet.availableToGive = allocation;
      return wallet.save();
    });
    await Promise.all(updatedWallets);
    return wallets;
  }
  async allocateCoinsToSpecificUsers(userEmails: string[], allocation: number) {
    if (allocation < 0) {
      throw new BadRequestException('Allocation must be a positive number');
    }

    // Find wallets of the specific users by their emails
    const wallets = await this.walletModel.find({
      userEmail: { $in: userEmails },
    });

    if (wallets.length === 0) {
      throw new NotFoundException('No wallets found for the specified users');
    }

    // Update the wallets of the specified users
    const updatedWallets = wallets.map((wallet) => {
      wallet.availableToGive = allocation;
      return wallet.save();
    });

    // Wait for all wallet updates to complete
    await Promise.all(updatedWallets);

    return wallets;
  }
  async sendCoins(fromUserEmail: string, toUserEmail: string, amount: number) {
    // Start a session
    const session = await this.connection.startSession();
    session.startTransaction(); // Begin transaction

    try {
      const fromWallet = await this.walletModel
        .findOne({ userEmail: fromUserEmail })
        .session(session);
      const toWallet = await this.walletModel
        .findOne({ userEmail: toUserEmail })
        .session(session);

      if (!fromWallet || !toWallet) {
        throw new NotFoundException('Wallets not found');
      }

      if (fromWallet.availableToGive < amount) {
        throw new BadRequestException('Insufficient balance to give');
      }

      // Deduct from the sender's wallet
      fromWallet.availableToGive -= amount;
      // Add to the receiver's wallet
      toWallet.earnedBalance += amount;

      // Save both wallets within the transaction
      await fromWallet.save({ session });
      await toWallet.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      return { success: true, message: 'Coins sent successfully' };
    } catch (error) {
      // If an error occurs, abort the transaction
      await session.abortTransaction();
      throw error; // Rethrow the error so it can be handled elsewhere
    } finally {
      // End the session
      session.endSession();
    }
  }
}
