import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { Wallet } from './schema/Wallet.schema';

@Injectable()
export class WalletService {
  constructor(@InjectModel(Wallet.name) private walletModel: Model<Wallet>) {}

  async createWallet(userId: Types.ObjectId, session: ClientSession) {
    const newWallet = new this.walletModel({
      userId,
      earnedCoins: 0,
      coinsAvailable: 0,
    });
    return newWallet.save({ session });
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
}
