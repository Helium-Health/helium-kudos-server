import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/schemas/User.schema';
import { CreateUserDto } from './dto/User.dto';
// import { Wallet } from 'src/schemas/wallet.schema';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private walletService: WalletService,
  ) {}

  // Method to create a new user
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const wallet = await this.walletService.createWallet(createUserDto.email);
    await wallet.save();

    const user = new this.userModel({
      ...createUserDto,
      wallet: wallet._id, // Link wallet to the user
    });

    return user.save();
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
