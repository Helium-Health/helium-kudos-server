import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
  UserGender,
  UserTeam,
} from 'src/users/schema/User.schema';
import { CreateUserDto, InviteUserDto, UpdateUserDto } from './dto/User.dto';
import { WalletService } from 'src/wallet/wallet.service';
import { UpdateUserFromSheetDto } from './dto/UpdateFromSheet.dto';
import { MilestoneType } from 'src/milestone/schema/Milestone.schema';
import * as argon2 from 'argon2';
import {
  fieldsToMerge,
  fieldsToRevert,
  PRODUCTION_CLIENT,
  STAGING_CLIENT,
} from 'src/constants';
import { WithId } from 'mongodb';
import { SlackService } from 'src/slack/slack.service';
import { GroupsService } from 'src/groups/groups.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => GroupsService))
    private groupService: GroupsService,
    @InjectModel(User.name) private userModel: Model<User>,
    private walletService: WalletService,

    private readonly slackService: SlackService,
    @Inject('AUTH_SERVICE') private authService,
  ) {}

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
    return await this.userModel
      .findOne({
        email,
      })
      .exec();
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

  async getInactiveUserEmails(userIds: string[]): Promise<string[]> {
    const inactiveUsers = await this.userModel.find(
      { _id: { $in: userIds }, active: false },
      { email: 1 },
    );

    return inactiveUsers.map((user) => user.email);
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

  async updateUserFields(
    userId: Types.ObjectId,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateUserDto);

    return user.save();
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
        active: true,
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
        active: true,
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
    return this.userModel.find({ gender, active: true }).exec();
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

    active !== undefined && (query.active = active);

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

  async getAllUsers(): Promise<UserDocument[]> {
    return await this.userModel.find({ active: true }).exec();
  }

  async updateByEmail(email: string, updateData: UpdateUserFromSheetDto) {
    return await this.userModel.findOneAndUpdate(
      { email, active: true }, // Only update active users
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
    const todayISOString = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).toISOString();

    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $match: { active: true },
      },

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
                  if: {
                    $gte: [
                      {
                        $dateToString: {
                          format: '%Y-%m-%d',
                          date: '$nextBirthday',
                        },
                      },
                      todayISOString,
                    ],
                  },
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
                  if: {
                    $gte: [
                      {
                        $dateToString: {
                          format: '%Y-%m-%d',
                          date: '$nextAnniversary',
                        },
                      },
                      todayISOString,
                    ],
                  },
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

      {
        $unionWith: {
          coll: 'milestones',
          pipeline: [
            {
              $match: {
                milestoneDate: { $gte: new Date(todayISOString) },
                isActive: true,
              },
            },
            {
              $project: {
                name: '$title',
                picture: null,
                celebrations: {
                  celebrationType: '',
                  date: '$milestoneDate',
                },
              },
            },
          ],
        },
      },

      ...(month
        ? [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: [{ $month: '$celebrations.date' }, month] },
                    {
                      $eq: [{ $month: '$celebrations.date' }, (month % 12) + 1],
                    },
                  ],
                },
              },
            },
          ]
        : []),

      ...(celebrationType
        ? [{ $match: { 'celebrations.celebrationType': celebrationType } }]
        : []),

      { $sort: { 'celebrations.date': 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          count: [{ $count: 'totalCelebrations' }],
        },
      },
    ];

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

  async inviteUser(inviteUserDto: InviteUserDto): Promise<User> {
    const {
      email,
      name,
      gender,
      picture,
      role,
      dateOfBirth,
      joinDate,
      team,
      nationality,
      groupId,
    } = inviteUserDto;

    const clientUrl =
      process.env.NODE_ENV === 'production'
        ? PRODUCTION_CLIENT
        : STAGING_CLIENT;
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      const slackUserId = await this.slackService.getUserIdByEmail(email);
      if (!slackUserId) {
        throw new NotFoundException(
          'User is not a member of the organization on Slack',
        );
      }

      const existingUser = await this.userModel
        .findOne({ email })
        .session(session)
        .exec();
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const newUser = new this.userModel({
        email,
        originalEmail: email,
        name,
        gender,
        picture,
        role: role || 'user',
        verified: false,
        active: true,
        dateOfBirth,
        joinDate,
        team,
        nationality,
      });

      const savedUser = await newUser.save({ session });
      await this.slackService.sendDirectMessage(
        slackUserId.toString(),
        `Welcome to Helium Kudos!, Please sign in here: ${clientUrl}`,
      );
      if (groupId) {
        await this.groupService.addMembersToGroup(
          groupId,
          savedUser._id,
          session,
        );
      }

      await session.commitTransaction();
      session.endSession();

      return savedUser;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async resendInvite(id: Types.ObjectId) {
    const user = await this.userModel.findById(id);
    if (user && !user.verified) {
      const clientUrl =
        process.env.NODE_ENV === 'production'
          ? PRODUCTION_CLIENT
          : STAGING_CLIENT;
      await this.slackService.sendDirectMessage(
        id.toString(),
        `You have a pending invite from Helium Kudos!, Please sign in here: ${clientUrl}`,
      );
    }
    return user;
  }

  async getAllTeams() {
    return Object.values(UserTeam);
  }
  async mergeDuplicateEmails() {
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    console.log('Migration Up starting...');
    const updatedAccounts = [];

    try {
      // Using db.collection('users') directly would bypass Mongoose's schema middleware
      // and allow us to maintain the exact email casing.
      const db = this.userModel.db;

      // Find all users
      const users = await db
        .collection('users')
        .find({}, { session })
        .toArray();

      const emailGroups = users.reduce(
        (acc, user) => {
          const lowerEmail = user.email.toLowerCase();
          if (!acc[lowerEmail]) {
            acc[lowerEmail] = [];
          }
          acc[lowerEmail].push(user as WithId<User>);
          return acc;
        },
        {} as Record<string, WithId<User>[]>,
      );

      for (const [email, duplicates] of Object.entries(emailGroups)) {
        if (duplicates.length > 1) {
          console.log(`Found duplicates for email: ${email}`);
          // Find the verified user and unverified account
          const verifiedUser = duplicates.find((user) => user.verified);
          const unverifiedUser = duplicates.find((user) => !user.verified);

          if (!verifiedUser || !unverifiedUser) {
            continue; // if no verified/unverified user, skip
          }

          // Step 1: Save the original email (before modifying it to lowercase)
          const originalEmail = verifiedUser.email;

          // Step 2: Update the verified user email to lowercase
          verifiedUser.email = verifiedUser.email.toLowerCase();
          verifiedUser.originalEmail = originalEmail; // Save the original email

          // Step 2: Merge fields from unverified user
          fieldsToMerge.forEach((field) => {
            if (unverifiedUser[field] && !verifiedUser[field]) {
              verifiedUser[field] = unverifiedUser[field];
            }
          });

          // Step 3: Deactivate unverified user and update email
          const newEmail = `${unverifiedUser.email}_deactivated_${Date.now()}`;
          await db.collection('users').updateOne(
            { _id: unverifiedUser._id },
            {
              $set: {
                email: newEmail,
                originalEmail: unverifiedUser.email,
                active: false,
              },
            },
            { session },
          );

          await db
            .collection('users')
            .updateOne(
              { _id: verifiedUser._id },
              { $set: verifiedUser },
              { session },
            );

          updatedAccounts.push({
            verifiedUser: {
              id: verifiedUser._id,
              email: verifiedUser.email,
              originalEmail: verifiedUser.originalEmail,
              verified: verifiedUser.verified,
            },
            unverifiedUser: {
              id: unverifiedUser._id,
              email: newEmail,
              originalEmail: unverifiedUser.email,
              verified: unverifiedUser.verified,
            },
          });
        }
      }

      await session.commitTransaction();
    } catch (error) {
      console.log('Error during transaction:', error);
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Log final state after transaction commits
    console.log('Migration Up completed.', updatedAccounts);
  }

  async revertDuplicateEmailMerge() {
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    console.log('Migration Down starting...');
    const updatedAccounts = [];

    try {
      // Using db.collection('users') directly would bypass Mongoose's schema middleware
      // and allow us to maintain the exact email casing.
      const db = this.userModel.db;

      // Find all deactivated users
      const deactivatedUsers = await db
        .collection('users')
        .find(
          {
            email: { $regex: '_deactivated_' },
            active: false,
          },
          { session },
        )
        .toArray();

      const unsetFields = fieldsToRevert.reduce((acc, field) => {
        acc[field] = undefined; // or use undefined
        return acc;
      }, {});

      // Iterate through the deactivated users and revert changes
      for (const deactivatedAccount of deactivatedUsers) {
        const originalEmail =
          deactivatedAccount.email.split('_deactivated_')[0]; // Extract original email
        const verifiedUser = await db.collection('users').findOne(
          {
            email: originalEmail.toLowerCase(),
          },
          { session },
        );

        if (!verifiedUser) {
          continue; // If no corresponding verified user exists, skip
        }

        // Step 1: Restore the verified user's email to lowercase
        await db.collection('users').updateOne(
          { _id: verifiedUser._id },
          {
            $set: {
              email: verifiedUser.originalEmail,
            },
            $unset: unsetFields,
          },
          { session },
        );

        console.log(`Reverted email for user with ID: ${verifiedUser.email}`);

        // Step 2: Restore the original email and reactivate the account
        await db.collection('users').updateOne(
          { _id: deactivatedAccount._id },
          {
            $set: {
              email: originalEmail,
              active: true,
            },
            $unset: {
              originalEmail: undefined,
            },
          },
          { session }, // Include the session
        );

        updatedAccounts.push({
          verifiedUser: {
            id: verifiedUser._id,
            email: verifiedUser.originalEmail,
            verified: verifiedUser.verified,
          },
          unverifiedUser: {
            id: deactivatedAccount._id,
            email: originalEmail,
            verified: deactivatedAccount.verified,
          },
        });
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Log final state after transaction commits
    console.log('Migration Down completed.', updatedAccounts);
  }
}
