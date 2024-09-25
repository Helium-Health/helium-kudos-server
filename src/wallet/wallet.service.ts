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
  async createWallet(email: string): Promise<Wallet> {
    const newWallet = new this.walletModel({
      email, // Link the wallet to the user
      earnedBalance: 0,
      availableToGive: 0,
    });
    return await newWallet.save();
  }
  async getUserBalances(userId: string) {
    const wallet = await this.walletModel.findOne({ userId });
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }
    return {
      earnedBalance: wallet.earnedBalance,
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

  async allocateCoins(userId: string, allocation: number) {
    const wallet = await this.walletModel.findOne({ userId });
    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }
    if (allocation < 0) {
      throw new BadRequestException('Allocation must be a positive number');
    }
    wallet.availableToGive += allocation;
    return wallet.save();
  }

  async sendCoins(fromUserId: string, toUserId: string, amount: number) {
    const fromWallet = await this.walletModel.findOne({ userId: fromUserId });
    const toWallet = await this.walletModel.findOne({ userId: toUserId });

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
