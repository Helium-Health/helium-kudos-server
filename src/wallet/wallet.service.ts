import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection, Types, ClientSession } from 'mongoose';
// import { UpdateCurrencyDto } from 'src/currency/dto/currency.dto';
import { Wallet } from 'src/wallet/schema/Wallet.schema';
import { CurrencyService } from 'src/currency/currency.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly currencyService: CurrencyService,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    @InjectConnection() private readonly connection: Connection,
  ) {}
  async createWallet(
    userId: Types.ObjectId,
    session: ClientSession,
  ): Promise<Wallet> {
    const newWallet = new this.walletModel({
      userId,
      earnedCoins: 0,
      coinsAvailable: 0,
    });
    return newWallet.save({ session });
  }
  async getUserBalances(userId: Types.ObjectId) {
    const wallet = await this.walletModel.findOne({ _id: userId });
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }
    return {
      earnedBalance: wallet.earnedCoins,
      availableToGive: wallet.coinsAvailable,
    };
  }
  async getEarnedCoinBalance(userId: Types.ObjectId) {
    const wallet = await this.walletModel.findOne({ _id: userId });
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }
    return {
      earnedBalance: wallet.earnedCoins,
    };
  }

  async getAvailableToGive(userId: Types.ObjectId) {
    const wallet = await this.walletModel.findOne({ _id: userId });
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }
    return {
      availableToGive: wallet.coinsAvailable,
    };
  }
  async incrementEarnedCoins(
    userId: Types.ObjectId,
    amount: number,
    session: ClientSession,
  ) {
    return this.walletModel
      .findOneAndUpdate(
        { userId },
        { $inc: { earnedCoins: amount } },
        { session, new: true, upsert: false },
      )
      .then((result) => {
        if (!result) {
          throw new NotFoundException(`Wallet not found for user ${userId}`);
        }
        return result;
      });
  }
  async decrementGivableCoins(
    userId: Types.ObjectId,
    amount: number,
    session: ClientSession,
  ) {
    const wallet = await this.walletModel
      .findOne({ userId })
      .session(session)
      .exec();

    // Check if the wallet exists
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }

    // Check if the user has enough givable coins
    if (wallet.coinsAvailable < amount) {
      throw new BadRequestException(
        `Insufficient givable coins for user ${userId}`,
      );
    }
    return this.walletModel
      .findOneAndUpdate(
        { userId },
        { $inc: { earnedCoins: -amount } },
        { session, new: true, upsert: false },
      )
      .then((result) => {
        if (!result) {
          throw new NotFoundException(`Wallet not found for user ${userId}`);
        }
        return result;
      });
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
      wallet.coinsAvailable = allocation;
      return wallet.save();
    });
    await Promise.all(updatedWallets);
    return wallets;
  }
  async allocateCoinsToSpecificUsers(
    userIds: Types.ObjectId[],
    allocation: number,
  ) {
    if (allocation < 0) {
      throw new BadRequestException('Allocation must be a positive number');
    }

    // Find wallets of the specific users by their Ids
    const wallets = await this.walletModel.find({
      _id: { $in: userIds },
    });

    if (wallets.length === 0) {
      throw new NotFoundException('No wallets found for the specified users');
    }

    // Update the wallets of the specified users
    const updatedWallets = wallets.map((wallet) => {
      wallet.coinsAvailable = allocation;
      return wallet.save();
    });

    // Wait for all wallet updates to complete
    await Promise.all(updatedWallets);

    return wallets;
  }
}
