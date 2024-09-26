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
      earnedBalance: wallet.availableToGive,
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

  async allocateCoins(userEmail: string, allocation: number) {
    // Find the user's wallet based on their email
    const wallet = await this.walletModel
      .findOne({ userEmail: userEmail })
      .populate('coins')
      .exec();

    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }

    if (allocation < 0) {
      throw new BadRequestException('Allocation must be a positive number');
    }

    // Set the expiration date to 3 months from the current date
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 3);

    // Create a new coin entry with the specified allocation and expiration date
    const newCoin = new this.coinModel({
      allocation: allocation,
      expirationDate: expirationDate,
    });

    await newCoin.save(); // Save the coin entry to the database

    // Add the new coin to the user's wallet and update availableToGive
    wallet.coins.push(newCoin._id);
    wallet.availableToGive += allocation;

    await wallet.save(); // Save the updated wallet

    return wallet;
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
  async calculateAvailableToGive(userEmail: string): Promise<number> {
    const wallet = await this.walletModel
      .findOne({ userEmail })
      .populate('coins'); // Populate coins

    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }

    const currentDate = new Date();
    let totalAvailable = 0;

    const coins = wallet.coins as unknown as Coin[];

    for (const coin of coins) {
      if (coin.expirationDate && coin.expirationDate > currentDate) {
        totalAvailable += coin.allocation; // Only count non-expired coins
      }
    }

    // Update wallet's availableToGive
    wallet.availableToGive = totalAvailable;
    await wallet.save();

    return totalAvailable; // Return the updated balance
  }
}
