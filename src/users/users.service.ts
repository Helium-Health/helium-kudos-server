import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserGender } from 'src/users/schema/User.schema';
import { CreateUserDto, UpdateUserDto } from './dto/User.dto';
import { WalletService } from 'src/wallet/wallet.service';
import { UpdateUserFromSheetDto } from './dto/UpdateFromSheet.dto';
import { MilestoneType } from 'src/milestone/schema/Milestone.schema';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private walletService: WalletService,
    @Inject('AUTH_SERVICE') private authService
  ) {}

  // Method to create a new user
  async createUser(createUserDto: CreateUserDto) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      const newUser = new this.userModel({...createUserDto, refreshToken: 'initialRefreshToken'}); 
      await newUser.save({ session });

      await this.walletService.createWallet(newUser._id, session);

      const newUserRefreshToken = await this.authService.generateAndStoreRefreshToken(newUser);

      newUser.refreshToken = await argon2.hash(newUserRefreshToken);

      await newUser.save({ session });



      await session.commitTransaction();
      return {newUser, newUserRefreshToken};
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

  // Method to find a user by id
  async findById(_id: Types.ObjectId): Promise<User | UserDocument | null> {
    return this.userModel.findOne({ _id }).exec();
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
    updateData: UpdateUserDto,
  ): Promise<User | null> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return updatedUser;
  }

  async deleteUser(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async findUsersByBirthday(
    month: number,
    day: number,
  ): Promise<UserDocument[]> {
    return this.userModel
      .find({
        $expr: {
          $and: [
            { $eq: [{ $month: '$dateOfBirth' }, month] },
            { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] },
          ],
        },
      })
      .exec();
  }

  async findUsersByWorkAnniversary(
    month: number,
    day: number,
  ): Promise<UserDocument[]> {
    return this.userModel
      .find({
        $expr: {
          $and: [
            { $eq: [{ $month: '$joinDate' }, month] },
            { $eq: [{ $dayOfMonth: '$joinDate' }, day] },
          ],
        },
      })
      .exec();
  }

  async findUsersByGender(gender: UserGender): Promise<UserDocument[]> {
    return this.userModel.find({ gender }).exec();
  }

  async findUsers(
    name: string,
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    users: User[];
    meta: {
      totalCount: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const query: any = {
      _id: { $ne: new Types.ObjectId(userId) },
    };

    if (name) {
      const words = name.trim().split(/\s+/);
      query.$and = words.map((word) => ({
        name: { $regex: `.*${word}.*`, $options: 'i' },
      }));
    }

    const totalCount = await this.userModel.countDocuments(query).exec();
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;
    const users = await this.userModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      users,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }

  async updateByEmail(email: string, updateData: UpdateUserFromSheetDto) {
    return this.userModel.findOneAndUpdate(
      { email },
      { $set: updateData },
      { new: true },
    );
  }

  async getUpcomingCelebrations(
    limit: number,
    page: number,
    month?: number,
    celebrationType?: MilestoneType,
  ): Promise<any> {
    const today = new Date();
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $addFields: {
          nextBirthday: {
            $dateFromParts: {
              year: { $year: today },
              month: { $month: '$dateOfBirth' },
              day: { $dayOfMonth: '$dateOfBirth' },
            },
          },
          nextAnniversary: {
            $dateFromParts: {
              year: { $year: today },
              month: { $month: '$joinDate' },
              day: { $dayOfMonth: '$joinDate' },
            },
          },
        },
      },
      {
        $project: {
          name: 1,
          picture: 1,
          celebrations: {
            $concatArrays: [
              {
                $cond: {
                  if: { $gte: ['$nextBirthday', today] },
                  then: [
                    {
                      celebrationType: MilestoneType.BIRTHDAY,
                      date: '$nextBirthday',
                    },
                  ],
                  else: [],
                },
              },
              {
                $cond: {
                  if: { $gte: ['$nextAnniversary', today] },
                  then: [
                    {
                      celebrationType: MilestoneType.WORK_ANNIVERSARY,
                      date: '$nextAnniversary',
                    },
                  ],
                  else: [],
                },
              },
            ],
          },
        },
      },
      { $unwind: '$celebrations' },
    ];

    if (month) {
      pipeline.push({
        $match: {
          $expr: {
            $eq: [{ $month: '$celebrations.date' }, month],
          },
        },
      });
    }

    if (celebrationType) {
      pipeline.push({
        $match: { 'celebrations.celebrationType': celebrationType },
      });
    }

    pipeline.push(
      { $sort: { 'celebrations.date': 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          count: [{ $count: 'totalCelebrations' }],
        },
      },
    );

    const [result] = await this.userModel.aggregate(pipeline);

    const celebrations = result?.data || [];
    const totalCount = result?.count[0]?.totalCelebrations || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: celebrations,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }
}
