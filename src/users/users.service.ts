import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schema/User.schema';
import { CreateUserDto } from './dto/User.dto';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private walletService: WalletService,
  ) {}

  // Method to create a new user
  async createUser(createUserDto: CreateUserDto) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      const newUser = new this.userModel(createUserDto);
      await newUser.save({ session });

      await this.walletService.createWallet(newUser._id, session);

      await session.commitTransaction();
      return newUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Method to find a user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  // Additional methods for other user operations
  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async validateUserIds(userIds: string[]): Promise<boolean> {
    try {
      const count = await this.userModel.countDocuments({
        _id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
      });
      return count === userIds.length;
    } catch {
      throw new InternalServerErrorException(
        'An error occurred while validating user IDs',
      );
    }
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
