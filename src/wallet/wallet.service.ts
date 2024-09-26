// wallet.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet } from 'src/schemas/wallet.schema';
import { Coin } from 'src/schemas/coin.schema';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    @InjectModel(Coin.name) private coinModel: Model<Coin>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}
  async createWallet(userEmail: string): Promise<Wallet> {
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
  //Admin can set naira equivalence of coin
  async setCoinToNaira(value: number) {
    let coin = await this.coinModel.findOne();
    if (!coin) {
      coin = new this.coinModel();
    }
    coin.coinToNaira = value;
    return coin.save();
  }

  async getNairaEquivalent(userEmail: string) {
    const wallet = await this.walletModel.findOne({ userId: userEmail });

    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }
    const coin = await this.coinModel.findOne();
    const conversionRate = coin ? coin.coinToNaira : 100;
    const nairaEquivalent = wallet.earnedBalance / conversionRate;

    return {
      earnedBalance: wallet.earnedBalance,
      nairaEquivalent: nairaEquivalent,
    };
  }
  async allocateCoins(userEmail: string, allocation: number) {
    const wallet = await this.walletModel.findOne({ userEmail });
    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }
    if (allocation < 0) {
      throw new BadRequestException('Allocation must be a positive number');
    }
    wallet.availableToGive = allocation;
    return wallet.save();
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
    const fromWallet = await this.walletModel.findOne({
      userEmail: fromUserEmail,
    });
    const toWallet = await this.walletModel.findOne({ userEmail: toUserEmail });

    if (!fromWallet || !toWallet) {
      throw new NotFoundException('Wallets not found');
    }

    if (fromWallet.availableToGive < amount) {
      throw new BadRequestException('Insufficient balance to give');
    }

    fromWallet.availableToGive -= amount;
    toWallet.earnedBalance += amount;

    await fromWallet.save();
    await toWallet.save();

    return { success: true, message: 'Coins sent successfully' };
  }
}
