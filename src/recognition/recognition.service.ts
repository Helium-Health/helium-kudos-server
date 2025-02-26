import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Recognition, RecognitionDocument } from './schema/Recognition.schema';
import {
  CreateRecognitionDto,
  EditRecognitionDto,
} from './dto/CreateRecognition.dto';
import { UserRecognitionService } from 'src/user-recognition/user-recognition.service';
import { UserRecognitionRole } from 'src/user-recognition/schema/UserRecognition.schema';
import { UsersService } from 'src/users/users.service';
import { WalletService } from 'src/wallet/wallet.service';
import { CompanyValues } from 'src/constants/companyValues';
import { Reaction } from 'src/reactions/schema/reactions.schema';
import {
  EntityType,
  transactionStatus,
} from 'src/transaction/schema/Transaction.schema';
import { MilestoneType } from 'src/milestone/schema/Milestone.schema';
import { ClaimService } from 'src/claim/claim.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { RecognitionGateway } from './recognition.gateway';
import { UserRole } from 'src/users/schema/User.schema';
import { SlackService } from 'src/slack/slack.service';
import { PRODUCTION_CLIENT, STAGING_CLIENT } from 'src/constants';

@Injectable()
export class RecognitionService {
  constructor(
    @Inject(forwardRef(() => ClaimService))
    private readonly claimService: ClaimService,
    @Inject(RecognitionGateway) private recognitionGateway: RecognitionGateway,
    @InjectModel(Recognition.name)
    private readonly recognitionModel: Model<Recognition>,
    private readonly userRecognitionService: UserRecognitionService,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
    private readonly slackService: SlackService,
    private readonly transactionService: TransactionService,
  ) {}

  async createRecognition(
    senderId: string,
    { receivers, message, companyValues = [], giphyUrl }: CreateRecognitionDto,
  ) {
    const invalidValues = companyValues.filter(
      (value) => !Object.values(CompanyValues).includes(value),
    );

    if (receivers.length === 0) {
      throw new BadRequestException(
        'At least one receiver is required for recognition',
      );
    }

    if (invalidValues.length > 0) {
      throw new BadRequestException(
        `Invalid company values: ${invalidValues.join(', ')}`,
      );
    }

    if (receivers.some((receiver) => receiver.receiverId === senderId)) {
      throw new BadRequestException(
        'Sender cannot be a receiver of the recognition',
      );
    }

    const validGiphyUrls = Array.isArray(giphyUrl)
      ? giphyUrl.filter(Boolean)
      : [];

    const receiverIds = receivers.map((receiver) => receiver.receiverId);
    const areValidUsers = await this.usersService.validateUserIds(receiverIds);

    if (!areValidUsers) {
      throw new BadRequestException('One or more receiver IDs are invalid');
    }

    const totalCoinAmount = receivers.reduce(
      (sum, r) => sum + (r.coinAmount ?? 0),
      0,
    );

    const hasEnoughCoins = await this.walletService.hasEnoughCoins(
      new Types.ObjectId(senderId),
      totalCoinAmount,
    );
    if (!hasEnoughCoins) {
      throw new BadRequestException("Insufficient coins in sender's wallet");
    }

    const session = await this.recognitionModel.db.startSession();
    session.startTransaction();

    try {
      const newRecognition = new this.recognitionModel({
        senderId: new Types.ObjectId(senderId),
        message,
        giphyUrl: validGiphyUrls,
        receivers: receivers.map((r) => ({
          receiverId: new Types.ObjectId(r.receiverId),
          coinAmount: r.coinAmount ?? 0,
        })),
        companyValues,
      });
      await newRecognition.save({ session });

      const userRecognitions = receivers.map((receiver) => ({
        userId: new Types.ObjectId(receiver.receiverId),
        recognitionId: newRecognition._id,
        role: UserRecognitionRole.RECEIVER,
      }));

      await this.userRecognitionService.createMany(userRecognitions, session);

      if (totalCoinAmount === 0) {
        Logger.log('Total coin amount is 0, skipping Claim Creation.');
      } else {
        await this.claimService.claimCoin(
          {
            senderId: new Types.ObjectId(senderId),
            receivers: receivers.map((r) => ({
              receiverId: new Types.ObjectId(r.receiverId),
              amount: r.coinAmount ?? 0,
            })),
            recognitionId: newRecognition._id,
            totalCoinAmount,
          },
          session,
        );
      }

      await session.commitTransaction();

      this.recognitionGateway.notifyClients({
        recognitionId: newRecognition._id,
        message: `Recognition created: ${message}`,
        senderId,
        receivers: receivers.map((r) => ({
          receiverId: new Types.ObjectId(r.receiverId),
          amount: r.coinAmount ?? 0,
        })),
        companyValues,
        giphyUrl,
      });

      await this.notifyReceiversViaSlack(
        new Types.ObjectId(senderId),
        receivers,
      );

      return newRecognition;
    } catch (error) {
      await session.abortTransaction();

      if (error instanceof NotFoundException) {
        throw new BadRequestException(`Invalid receiver: ${error.message}`);
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  private async notifyReceiversViaSlack(
    senderId: Types.ObjectId,
    receivers: CreateRecognitionDto['receivers'],
  ) {
    const sender = await this.usersService.findById(senderId);
    const clientUrl =
      process.env.NODE_ENV === 'production'
        ? PRODUCTION_CLIENT
        : STAGING_CLIENT;

    for (const receiver of receivers) {
      const receiverUser = await this.usersService.findById(
        new Types.ObjectId(receiver.receiverId),
      );
      if (receiverUser?.email) {
        const slackUserId = await this.slackService.getUserIdByEmail(
          receiverUser.email,
        );
        if (slackUserId) {
          const notificationMessage = `🌟 Hey ${receiverUser.name}!\n\n ${sender.name} just recognized your awesome work!\n\nCheck it out here: ${clientUrl}`;
          await this.slackService.sendDirectMessage(
            slackUserId,
            notificationMessage,
          );
        }
      }
    }
  }

  async editRecognition(
    recognitionId: Types.ObjectId,
    userId: Types.ObjectId,
    { message }: EditRecognitionDto,
  ) {
    const recognition = await this.recognitionModel.findById(recognitionId);

    if (!recognition) {
      throw new NotFoundException('Recognition not found');
    }

    if (!recognition.senderId.equals(userId)) {
      throw new ForbiddenException(
        'You are not authorized to edit this recognition',
      );
    }

    recognition.message = message;
    await recognition.save();

    this.recognitionGateway.notifyClients({
      recognitionId,
      message: `Recognition updated: ${message}`,
      userId,
    });

    return recognition;
  }

  async createAutoRecognition({
    receiverId,
    message,
    coinAmount = 0,
    milestoneType,
  }: {
    receiverId: string;
    message: string;
    coinAmount?: number;
    milestoneType: MilestoneType;
  }) {
    const session = await this.recognitionModel.db.startSession();
    session.startTransaction();

    try {
      const newRecognition = new this.recognitionModel({
        message,
        isAuto: true,
        milestoneType,
        receivers: [{ receiverId: new Types.ObjectId(receiverId), coinAmount }],
      });
      await newRecognition.save({ session });

      // Create single UserRecognition entry
      await this.userRecognitionService.create(
        {
          userId: new Types.ObjectId(receiverId),
          recognitionId: newRecognition._id,
          role: UserRecognitionRole.RECEIVER,
        },
        session,
      );

      if (coinAmount > 0) {
        // Update receiver's coin bank
        await this.walletService.incrementEarnedBalance(
          new Types.ObjectId(receiverId),
          coinAmount,
          session,
        );

        // Record the transaction
        await this.transactionService.recordAutoTransaction(
          {
            receiverId: new Types.ObjectId(receiverId),
            amount: coinAmount,

            entityId: newRecognition._id,
            entityType: EntityType.RECOGNITION,
          },
          session,
        );
      }

      await session.commitTransaction();
      this.recognitionGateway.notifyClients({
        recognitionId: newRecognition._id,
        message: `Recognition created: ${message}`,
        recognitionType: EntityType.RECOGNITION,
        receivers: receiverId,
        amount: coinAmount,
      });
      return newRecognition;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async findById(
    recognitionId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<RecognitionDocument> {
    const query = this.recognitionModel.findById(recognitionId);
    if (session) {
      query.session(session);
    }
    const recognition = await query.exec();
    if (!recognition) {
      throw new NotFoundException('Recognition not found');
    }
    return recognition;
  }

  async addReactionToRecognition(
    recognitionId: Types.ObjectId,
    reaction: Reaction,
    session?: ClientSession,
  ): Promise<void> {
    const recognition = await this.findById(recognitionId, session);
    recognition.reactions.push(reaction._id as Types.ObjectId);
    await recognition.save({ session });
  }

  async removeReactionFromRecognition(
    recognitionId: Types.ObjectId,
    reactionId: Types.ObjectId,
    session: ClientSession,
  ): Promise<void> {
    const recognition = await this.findById(recognitionId, session);
    recognition.reactions = recognition.reactions.filter(
      (r: Types.ObjectId) => !r.equals(reactionId),
    );
    await recognition.save({ session });
  }

  async getAllRecognitions(
    page: number,
    limit: number,
    userId?: string,
    role?: string,
    milestoneType?: MilestoneType,
    isAuto?: Boolean,
  ) {
    if (userId && !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    if (role && !['sender', 'receiver'].includes(role)) {
      throw new BadRequestException(
        'Invalid role value. Must be "sender" or "receiver".',
      );
    }

    const skip = (page - 1) * limit;
    const matchFilter: Record<string, any> = {};

    if (userId) {
      if (role === 'sender') {
        matchFilter.senderId = new Types.ObjectId(userId);
      } else if (role === 'receiver') {
        matchFilter['receivers.receiverId'] = new Types.ObjectId(userId);
      } else {
        matchFilter.$or = [
          { senderId: new Types.ObjectId(userId) },
          { 'receivers.receiverId': new Types.ObjectId(userId) },
        ];
      }
    }

    if (milestoneType) {
      if (!Object.values(MilestoneType).includes(milestoneType)) {
        throw new BadRequestException('Invalid milestoneType value');
      }
      matchFilter.milestoneType = milestoneType;
    }

    if (isAuto !== undefined) {
      matchFilter.isAuto = { $eq: isAuto };
    }

    const [recognitions, totalCount] = await Promise.all([
      this.recognitionModel.aggregate([
        { $match: matchFilter },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'sender',
          },
        },
        {
          $addFields: {
            sender: { $arrayElemAt: ['$sender', 0] },
          },
        },
        {
          $unwind: {
            path: '$receivers',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'receivers.receiverId',
            foreignField: '_id',
            as: 'receiverDetails',
          },
        },
        {
          $addFields: {
            'receivers.details': { $arrayElemAt: ['$receiverDetails', 0] },
          },
        },
        {
          $lookup: {
            from: 'reactions',
            let: { recognitionId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$recognitionId', '$$recognitionId'] },
                },
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'userId',
                  foreignField: '_id',
                  as: 'user',
                },
              },
              { $unwind: '$user' },
              {
                $group: {
                  _id: '$shortcodes',
                  users: { $push: '$user.name' },
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  _id: 0,
                  shortcode: '$_id',
                  users: 1,
                  count: 1,
                },
              },
            ],
            as: 'reactions',
          },
        },
        {
          $group: {
            _id: '$_id',
            message: { $first: '$message' },
            companyValues: { $first: '$companyValues' },
            createdAt: { $first: '$createdAt' },
            isAuto: { $first: '$isAuto' },
            sender: { $first: '$sender' },
            giphyUrl: { $first: '$giphyUrl' },
            receivers: {
              $push: {
                _id: '$receivers.receiverId',
                coinAmount: '$receivers.coinAmount',
                name: '$receivers.details.name',
                picture: '$receivers.details.picture',
                role: '$receivers.details.role',
                team: '$receivers.details.team',
              },
            },
            commentCount: { $first: { $size: { $ifNull: ['$comments', []] } } },
            reactions: { $first: '$reactions' },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      this.recognitionModel.countDocuments(matchFilter),
    ]);

    return {
      data: recognitions,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async addCommentToRecognition(
    recognitionId: Types.ObjectId,
    commentId: Types.ObjectId,
    session?: ClientSession,
  ) {
    return this.recognitionModel.findByIdAndUpdate(
      recognitionId,
      { $push: { comments: commentId } },
      { session, new: true },
    );
  }

  async getRecognitionById(
    recognitionId: Types.ObjectId,
    options = {},
  ): Promise<boolean> {
    const recognition = await this.recognitionModel.findById(
      recognitionId,
      null,
      options,
    );
    return !!recognition;
  }

  async removeCommentFromRecognition(
    recognitionId: Types.ObjectId,
    commentId: Types.ObjectId,
  ) {
    return this.recognitionModel.findByIdAndUpdate(
      recognitionId,
      { $pull: { comments: commentId } },
      { new: true },
    );
  }

  async getTopRecognitionReceivers(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const result = await this.recognitionModel.aggregate([
      { $unwind: '$receivers' },
      {
        $group: {
          _id: '$receivers.receiverId',
          recognitionCount: { $sum: 1 },
          totalCoinEarned: { $sum: '$receivers.coinAmount' },
        },
      },
      { $sort: { recognitionCount: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          recognitionCount: 1,
          totalCoinEarned: 1,
          user: {
            userId: '$_id',
            email: '$user.email',
            name: '$user.name',
            picture: '$user.picture',
          },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'totalCount' }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const metadata = result[0]?.metadata[0] || { totalCount: 0 };
    const data = result[0]?.data || [];
    const totalCount = metadata.totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
      },
      data,
    };
  }

  async getTopRecognitionSenders(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const result = await this.recognitionModel.aggregate([
      {
        $group: {
          _id: '$senderId',
          postCount: { $sum: 1 },
          totalCoinSent: { $sum: { $sum: '$receivers.coinAmount' } },
        },
      },
      { $sort: { postCount: -1 } }, 
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          postCount: 1,
          totalCoinSent: 1,
          user: {
            userId: '$_id',
            email: '$user.email',
            name: '$user.name',
            picture: '$user.picture',
          },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'totalCount' }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const metadata = result[0]?.metadata[0] || { totalCount: 0 };
    const data = result[0]?.data || [];
    const totalCount = metadata.totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
      },
      data,
    };
  }

  async getQuarterParticipants(
    page: number = 1,
    limit: number = 10,
    year: number,
    quarter: number,
  ) {
    if (quarter < 1 || quarter > 4) {
      throw new Error('Invalid quarter. Quarter must be between 1 and 4.');
    }

    const startMonth = (quarter - 1) * 3;
    const startOfQuarter = new Date(year, startMonth, 1);
    const endOfQuarter = new Date(year, startMonth + 3, 0, 23, 59, 59);

    const skip = (page - 1) * limit;

    const result = await this.recognitionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfQuarter, $lte: endOfQuarter },
        },
      },
      {
        $project: {
          participants: {
            $concatArrays: [
              [{ $ifNull: ['$senderId', null] }],
              {
                $map: {
                  input: '$receivers',
                  as: 'receiver',
                  in: '$$receiver.receiverId',
                },
              },
            ],
          },
        },
      },
      { $unwind: '$participants' },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $group: {
          _id: '$userDetails._id',
          name: { $first: '$userDetails.name' },
          picture: { $first: '$userDetails.picture' },
        },
      },
      { $sort: { name: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $facet: {
          participants: [{ $project: { _id: 0, name: 1, picture: 1 } }],
          totalParticipants: [{ $count: 'count' }],
        },
      },
    ]);

    const participants = result[0]?.participants || [];
    const totalParticipantsCount = result[0]?.totalParticipants[0]?.count || 0;

    const totalUsersCount = await this.recognitionModel
      .distinct('senderId')
      .then((senders) =>
        this.recognitionModel
          .distinct('receivers.receiverId')
          .then((receivers) => new Set([...senders, ...receivers]).size),
      );

    const totalCoinsGivenOut = await this.recognitionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfQuarter, $lte: endOfQuarter },
        },
      },
      {
        $unwind: '$receivers',
      },
      {
        $group: {
          _id: null,
          totalCoins: { $sum: '$receivers.coinAmount' },
        },
      },
    ]);

    const totalCoins =
      totalCoinsGivenOut.length > 0 ? totalCoinsGivenOut[0].totalCoins : 0;

    const participationPercentage =
      totalUsersCount > 0
        ? ((totalParticipantsCount / totalUsersCount) * 100).toFixed(2)
        : '0.00';

    return {
      participants,
      participationPercentage: `${participationPercentage}%`,
      totalCoinsGivenOut: totalCoins,
      currentPage: page,
      totalPages: Math.ceil(totalParticipantsCount / limit),
    };
  }

  async getYearlyStatisticsWithMonthlyDetails(year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const yearlyStats = await this.recognitionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: null,
          totalRecognitionsGiven: { $sum: 1 },
          totalCoinsGiven: { $sum: { $sum: '$receivers.coinAmount' } },
          totalRecognitionsReceived: { $sum: 1 },
          totalCoinsReceived: { $sum: { $sum: '$receivers.coinAmount' } },
        },
      },
    ]);

    const monthlyStats = await this.recognitionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $addFields: {
          month: { $month: '$createdAt' },
        },
      },
      {
        $facet: {
          companyValues: [
            { $unwind: '$companyValues' },
            {
              $group: {
                _id: { month: '$month', companyValue: '$companyValues' },
                count: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: '$_id.month',
                values: {
                  $push: {
                    companyValue: '$_id.companyValue',
                    count: '$count',
                  },
                },
              },
            },
          ],
          monthlyRecognitionCounts: [
            {
              $group: {
                _id: { month: '$month' },
                totalRecognitionsGiven: { $sum: 1 },
                totalCoinsGiven: { $sum: { $sum: '$receivers.coinAmount' } },
                totalRecognitionsReceived: { $sum: 1 },
                totalCoinsReceived: { $sum: { $sum: '$receivers.coinAmount' } },
              },
            },
          ],
        },
      },
      {
        $project: {
          companyValues: 1,
          monthlyRecognitionCounts: 1,
        },
      },
    ]);

    const companyValuesByMonth =
      monthlyStats[0]?.companyValues.map((stat) => {
        const valueObject = stat.values.reduce((acc, curr) => {
          acc[curr.companyValue] = curr.count;
          return acc;
        }, {});

        return {
          month: stat._id,
          simplicity: valueObject['simplicity'] || 0,
          boldness: valueObject['boldness'] || 0,
          innovation: valueObject['innovation'] || 0,
          camaraderie: valueObject['camaraderie'] || 0,
        };
      }) || [];

    const recognitionCountsByMonth =
      monthlyStats[0]?.monthlyRecognitionCounts.map((stat) => ({
        month: stat._id.month,
        totalRecognitionsGiven: stat.totalRecognitionsGiven,
        totalCoinsGiven: stat.totalCoinsGiven,
        totalRecognitionsReceived: stat.totalRecognitionsReceived,
        totalCoinsReceived: stat.totalCoinsReceived,
      })) || [];

    const monthlyDetails = recognitionCountsByMonth.map((recognition) => {
      const companyValues = companyValuesByMonth.find(
        (values) => values.month === recognition.month,
      ) || {
        simplicity: 0,
        boldness: 0,
        innovation: 0,
        camaraderie: 0,
      };

      return {
        month: recognition.month,
        ...recognition,
        ...companyValues,
      };
    });

    return {
      totalRecognitionsGiven: yearlyStats[0]?.totalRecognitionsGiven || 0,
      totalCoinsGiven: yearlyStats[0]?.totalCoinsGiven || 0,
      totalRecognitionsReceived: yearlyStats[0]?.totalRecognitionsReceived || 0,
      totalCoinsReceived: yearlyStats[0]?.totalCoinsReceived || 0,
      monthlyDetails,
    };
  }

  private getStartAndEndDates(
    year: number,
    month?: number,
  ): { startDate: Date; endDate: Date } {
    let startDate: Date, endDate: Date;

    if (month) {
      startDate = new Date(year, month - 1, 1); // Start of the month
      endDate = new Date(year, month, 0, 23, 59, 59); // End of the month
    } else {
      startDate = new Date(year, 0, 1); // Start of the year
      endDate = new Date(year, 11, 31, 23, 59, 59); // End of the year
    }

    return { startDate, endDate };
  }

  async topUsers(
    year: number,
    filterBy: 'sender' | 'receiver' = 'sender',
    month?: number,
  ) {
    const { startDate, endDate } = this.getStartAndEndDates(year, month);

    const predefinedCompanyValues = Object.values(CompanyValues);

    if (filterBy === 'sender') {
      const topSenders = await this.recognitionModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $unwind: '$receivers' },
        {
          $group: {
            _id: '$senderId',
            totalRecognitionsGiven: { $sum: 1 },
            totalCoinsGiven: { $sum: '$receivers.coinAmount' },
            companyValuesGiven: { $push: '$companyValues' },
          },
        },
        { $sort: { totalRecognitionsGiven: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'senderDetails',
          },
        },
        {
          $unwind: { path: '$senderDetails', preserveNullAndEmptyArrays: true },
        },
      ]);

      const topSendersWithCompanyValues = topSenders.map((sender) => {
        const companyValuesGiven = sender.companyValuesGiven.flat();
        const valueObject = companyValuesGiven.reduce((acc, companyValue) => {
          if (predefinedCompanyValues.includes(companyValue)) {
            acc[companyValue] = (acc[companyValue] || 0) + 1;
          } else {
            acc['others'] = (acc['others'] || 0) + 1;
          }
          return acc;
        }, {});

        return {
          senderId: sender._id,
          name: sender.senderDetails?.name,
          email: sender.senderDetails?.email,
          picture: sender.senderDetails?.picture,
          totalRecognitionsGiven: sender.totalRecognitionsGiven,
          totalCoinsGiven: sender.totalCoinsGiven,
          companyValuesGivenCount: {
            [CompanyValues.Simplicity]:
              valueObject[CompanyValues.Simplicity] || 0,
            [CompanyValues.Boldness]: valueObject[CompanyValues.Boldness] || 0,
            [CompanyValues.Innovation]:
              valueObject[CompanyValues.Innovation] || 0,
            [CompanyValues.Camaraderie]:
              valueObject[CompanyValues.Camaraderie] || 0,
            others: valueObject['others'] || 0,
          },
        };
      });

      return { topRecognitionSenders: topSendersWithCompanyValues };
    }

    const topReceivers = await this.recognitionModel.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $unwind: '$receivers' },
      {
        $group: {
          _id: '$receivers.receiverId',
          totalRecognitionsReceived: { $sum: 1 },
          totalCoinsReceived: { $sum: '$receivers.coinAmount' },
          companyValuesReceived: { $push: '$companyValues' },
        },
      },
      { $sort: { totalRecognitionsReceived: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'receiverDetails',
        },
      },
      {
        $unwind: { path: '$receiverDetails', preserveNullAndEmptyArrays: true },
      },
    ]);

    const topReceiversWithCompanyValues = topReceivers.map((receiver) => {
      const companyValuesReceived = receiver.companyValuesReceived.flat();
      const valueObject = companyValuesReceived.reduce((acc, companyValue) => {
        if (predefinedCompanyValues.includes(companyValue)) {
          acc[companyValue] = (acc[companyValue] || 0) + 1;
        } else {
          acc['others'] = (acc['others'] || 0) + 1;
        }
        return acc;
      }, {});

      return {
        receiverId: receiver._id,
        name: receiver.receiverDetails?.name,
        email: receiver.receiverDetails?.email,
        picture: receiver.receiverDetails?.picture,
        totalRecognitionsReceived: receiver.totalRecognitionsReceived,
        totalCoinsReceived: receiver.totalCoinsReceived,
        companyValuesReceivedCount: {
          [CompanyValues.Simplicity]:
            valueObject[CompanyValues.Simplicity] || 0,
          [CompanyValues.Boldness]: valueObject[CompanyValues.Boldness] || 0,
          [CompanyValues.Innovation]:
            valueObject[CompanyValues.Innovation] || 0,
          [CompanyValues.Camaraderie]:
            valueObject[CompanyValues.Camaraderie] || 0,
          others: valueObject['others'] || 0,
        },
      };
    });

    return { topRecognitionReceivers: topReceiversWithCompanyValues };
  }

  async deleteRecognition(
    recognitionId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<string> {
    const session = await this.recognitionModel.db.startSession();
    session.startTransaction();
    try {
      const recognition = await this.recognitionModel
        .findById(recognitionId)
        .session(session);
      if (!recognition) {
        throw new BadRequestException('Recognition not found');
      }

      if (!recognition.senderId.equals(userId)) {
        const user = await this.usersService.findById(userId);
        if (!user || user.role !== UserRole.Admin) {
          throw new ForbiddenException(
            'You do not have permission to delete this recognition',
          );
        }
      }

      const claim =
        await this.claimService.findClaimByRecognitionId(recognitionId);
      if (claim && claim.status !== 'pending') {
        throw new BadRequestException(
          `Recognition cannot be deleted because the claim is ${claim.status}`,
        );
      }

      if (claim) {
        for (const receiver of claim.receivers) {
          const { receiverId, amount } = receiver;

          await this.transactionService.recordCreditTransaction(
            {
              senderId: claim.senderId,
              receiverId: new Types.ObjectId(receiverId),
              amount: Math.abs(amount),
              entityId: new Types.ObjectId(claim.recognitionId),
              entityType: EntityType.RECOGNITION,
              claimId: claim._id as Types.ObjectId,
              status: transactionStatus.REVERSED,
            },
            session,
          );
        }

        const totalCoinAmount = claim.receivers.reduce(
          (sum, receiver) => sum + receiver.amount,
          0,
        );

        await this.walletService.refundGiveableBalance(
          claim.senderId,
          totalCoinAmount,
          session,
        );
        await this.claimService.deleteClaimById(
          claim._id as Types.ObjectId,
          session,
        );
      }

      await this.recognitionModel
        .deleteOne({ _id: recognitionId })
        .session(session);

      await session.commitTransaction();
      return 'Recognition and associated claim deleted successfully';
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
