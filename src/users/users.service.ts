import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
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
    @Inject('AUTH_SERVICE') private authService,
  ) {}

  //TODO: Remove this method after DB migration
  async onModuleInit() {
    await this.updateExistingUsers(this.userModel);
  }

  async runTransactionWithRetry(session, operation) {
    for (let i = 0; i < 5; i++) {
      try {
        return await operation(session);
      } catch (err) {
        if (err.hasErrorLabel('TransientTransactionError')) {
          console.warn(`Retrying transaction due to error: ${err}`);
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, i) * 100),
          );
        } else {
          throw err;
        }
      }
    }
    throw new Error('Transaction failed after multiple retries');
  }

  // Method to create a new user
  async createUser(createUserDto: CreateUserDto) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      const op = async (session) => {
        // Step 1: Create user with placeholder refresh token
        const newUser = new this.userModel({
          ...createUserDto,
          refreshToken: '',
        });
        await newUser.save({ session });

        // Step 2: Create wallet
        await this.walletService.createWallet(newUser._id, session);

        // Step 3: Generate and hash the refresh token
        const newUserRefreshToken = await this.generateAndStoreRefreshToken(
          newUser._id,
          newUser,
          session,
        );

        await session.commitTransaction();
        return { newUser, newUserRefreshToken };
      };
      return await this.runTransactionWithRetry(session, op);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async generateAndStoreRefreshToken(
    id: Types.ObjectId,
    user: User,
    session: ClientSession,
  ) {
    const refreshToken =
      await this.authService.generateAndStoreRefreshToken(user);
    const hashedRefreshToken = await argon2.hash(refreshToken);

    await this.userModel.updateOne(
      { _id: id },
      { $set: { refreshToken: hashedRefreshToken } },
      { session },
    );

    return refreshToken;
  }

  // Method to find a user by email
  async findByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({ email: email.toLowerCase() }).exec();
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
    active: boolean,
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
      query.name = { $all: words.map((word) => new RegExp(word, 'i')) };
    }

    if (active) {
      query.active = active;
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
      { email: email.toLowerCase() },
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

  async activateUser(userId: Types.ObjectId, active: boolean): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.userModel.findByIdAndUpdate(
      userId,
      { active, ...(!active && { refreshToken: null }) },
      { new: true },
    );
  }

  //TODO: Remove this method after DB migration
  private async updateExistingUsers(userModel: Model<User>) {
    await userModel.updateMany(
      { active: { $exists: false } },
      { $set: { active: true } },
    );
    console.log('Existing users updated with default active value');
  }

  //Delete after merge to prod
  async findDuplicateUsers() {
    const users = await this.userModel.find().lean();

    const emailMapping = new Map<string, string>(); // { capitalEmailUserID -> lowercaseEmailUserID }
    const existingEmails = new Map<string, string>(); // { normalizedEmail -> userID }

    users.forEach((user) => {
      const normalizedEmail = user.email.toLowerCase();

      if (existingEmails.has(normalizedEmail)) {
        // Found a duplicate, store mapping
        emailMapping.set(
          user._id.toString(),
          existingEmails.get(normalizedEmail),
        );
      } else {
        existingEmails.set(normalizedEmail, user._id.toString());
      }
    });

    return emailMapping;
  }
}
