import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/schemas/User.schema';
import { CreateUserDto } from './dto/User.dto';
import { Wallet } from 'src/schemas/wallet.schema';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    private walletService: WalletService,
  ) {}

  // Method to create a new user, link wallet (using trasaction)
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    if (!createUserDto.email) {
      throw new Error('Email is required to create a user');
    }

    const session = await this.walletModel.startSession();
    session.startTransaction();

    let wallet;

    try {
      wallet = await this.walletService.createWallet(createUserDto.email);
      await wallet.save({ session }); // Save wallet within the transaction

      const user = new this.userModel({
        ...createUserDto,
        wallet: wallet._id, // Link wallet to the user
      });

      const savedUser = await user.save({ session }); // Save user within the transaction

      await session.commitTransaction(); // Commit if all is well
      return savedUser;
    } catch (error) {
      await session.abortTransaction(); // Roll back if something went wrong
      console.error('Error creating user or wallet:', error.message);
      throw new Error('Failed to create user and wallet');
    } finally {
      session.endSession(); // End the session
    }
  }

  // Method to find a user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).populate('wallet').exec();
  }

  // Additional methods for other user operations
  async findAll(): Promise<User[]> {
    return this.userModel.find().populate('wallet').exec();
  }

  async updateUser(
    id: string,
    updateData: Partial<User>,
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async deleteUser(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
