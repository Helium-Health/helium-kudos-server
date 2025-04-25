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
import { ClientSession, Model, PipelineStage, Types } from 'mongoose';
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
  TransactionStatus,
  TransactionType,
} from 'src/transaction/schema/Transaction.schema';
import { MilestoneType } from 'src/milestone/schema/Milestone.schema';
import { ClaimService } from 'src/claim/claim.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { RecognitionGateway } from './recognition.gateway';
import { UserRole } from 'src/users/schema/User.schema';
import { SlackService } from 'src/slack/slack.service';
import { PRODUCTION_CLIENT, STAGING_CLIENT } from 'src/constants';
import { CommentService } from 'src/comment/comment.service';
import { ReactionService } from 'src/reactions/reactions.service';

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

    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,

    @Inject(forwardRef(() => ReactionService))
    private readonly reactionService: ReactionService,
  ) {}

  async createRecognition(
    senderId: string,
    {
      receivers,
      message,
      companyValues = [],
      giphyUrl,
      media = [],
    }: CreateRecognitionDto,
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

    const inactiveUsers =
      await this.usersService.getInactiveUserEmails(receiverIds);
    if (inactiveUsers.length > 0) {
      throw new ForbiddenException(
        `The following users are inactive: ${inactiveUsers.join(', ')}`,
      );
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
        media: media.map((m) => ({
          url: m.url,
          type: m.type,
        })),
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

      await this.notifyReceiversViaSlack({
        receivers: receivers,
        senderId: new Types.ObjectId(senderId),
        isAuto: false,
        message: message,
      });

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

  private async notifyReceiversViaSlack({
    receivers,
    senderId,
    isAuto,
    message,
  }: {
    receivers: CreateRecognitionDto['receivers'];
    senderId?: Types.ObjectId;
    isAuto?: boolean;
    message?: string;
  }) {
    const sender = senderId
      ? await this.usersService.findById(senderId)
      : { name: 'Helium HR' };

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
          const notificationMessage = isAuto
            ? `${message} \n\nLogin to Helium Kudos to start shopping with you gifted coins: ${clientUrl}`
            : `🌟 Hey ${receiverUser.name}!\n\n ${sender.name} just recognized your awesome work!\n\nCheck it out here: ${clientUrl}`;
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
    receiverId: { receiverId: Types.ObjectId }[];
    message: string;
    coinAmount?: number;
    milestoneType: MilestoneType;
  }) {
    const session = await this.recognitionModel.db.startSession();
    session.startTransaction();

    try {
      // Create the new recognition entry
      const newRecognition = new this.recognitionModel({
        message,
        isAuto: true,
        milestoneType,
        receivers: receiverId.map(({ receiverId }) => ({
          receiverId,
          coinAmount,
        })),
      });

      await newRecognition.save({ session });

      // Prepare UserRecognition creation promises
      const userRecognitionPromises = receiverId.map(({ receiverId }) =>
        this.userRecognitionService.create(
          {
            userId: receiverId,
            recognitionId: newRecognition._id,
            role: UserRecognitionRole.RECEIVER,
          },
          session,
        ),
      );

      // Prepare wallet updates & transactions if coinAmount > 0
      let walletUpdatePromises: Promise<void>[] = [];
      let transactionPromises: Promise<void>[] = [];

      if (coinAmount > 0) {
        walletUpdatePromises = receiverId.map(({ receiverId }) =>
          this.walletService
            .incrementEarnedBalance(receiverId, coinAmount, session)
            .then(() => {}),
        );

        transactionPromises = receiverId.map(({ receiverId }) =>
          this.transactionService
            .recordAutoTransaction(
              {
                receiverId: receiverId,
                amount: coinAmount,
                entityId: newRecognition._id,
                entityType: EntityType.RECOGNITION,
                status: TransactionStatus.SUCCESS,
                type: TransactionType.CREDIT,
              },
              session,
            )
            .then(() => {}),
        );
      }

      await Promise.all([
        ...userRecognitionPromises,
        ...walletUpdatePromises,
        ...transactionPromises,
      ]);

      await session.commitTransaction();

      // Notify clients
      this.recognitionGateway.notifyClients({
        recognitionId: newRecognition._id,
        message: `Recognition created: ${message}`,
        recognitionType: EntityType.RECOGNITION,
        receivers: receiverId,
        amount: coinAmount,
      });

      await this.notifyReceiversViaSlack({
        receivers: receiverId.map(({ receiverId }) => ({
          receiverId: receiverId.toString(),
          coinAmount,
        })),
        senderId: null,
        isAuto: true,
        message,
      });

      return newRecognition;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async deleteAutoRecognition(recognitionId: Types.ObjectId): Promise<string> {
    const session = await this.recognitionModel.db.startSession();
    session.startTransaction();

    try {
      const recognition = await this.recognitionModel
        .findById(recognitionId)
        .session(session);

      if (!recognition) {
        throw new NotFoundException('Recognition not found');
      }

      if (!recognition.isAuto) {
        throw new BadRequestException(
          'This recognition is not an auto-generated recognition',
        );
      }

      // Reverse wallet balances for each receiver
      for (const receiver of recognition.receivers) {
        if (receiver.coinAmount > 0) {
          await this.walletService.incrementEarnedBalance(
            receiver.receiverId,
            -receiver.coinAmount,
            session,
          );

          // Record reversal transaction
          await this.transactionService.recordAutoTransaction(
            {
              receiverId: receiver.receiverId,
              amount: -receiver.coinAmount,
              entityId: recognitionId,
              entityType: EntityType.RECOGNITION,
              status: TransactionStatus.REVERSED,
              type: TransactionType.DEBIT,
            },
            session,
          );
        }
      }

      // Delete the recognition
      await this.recognitionModel
        .deleteOne({ _id: recognitionId })
        .session(session);

      // Delete associated user recognitions
      await this.userRecognitionService.deleteMany(recognitionId, session);

      // Delete associated reactions
      await this.reactionService.deleteMany(recognitionId, session);

      // Delete associated comments
      await this.commentService.deleteMany(recognitionId, session);

      await session.commitTransaction();
      return 'Auto-recognition and associated records deleted successfully';
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
            media: { $first: '$media' },
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

  async getTopRecognitionReceivers(
    page: number,
    limit: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const skip = (page - 1) * limit;
    const matchStage: any = {};

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const result = await this.recognitionModel.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),

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
      data,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getTopRecognitionSenders(
    page: number,
    limit: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const skip = (page - 1) * limit;
    const matchStage: any = {};

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    const result = await this.recognitionModel.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),

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
      data,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getCompanyValueAnalytics(startDate?: Date, endDate?: Date) {
    const matchStage: any = {};

    if (startDate) {
      matchStage.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      matchStage.createdAt = {
        ...matchStage.createdAt,
        $lte: new Date(endDate),
      };
    }

    const result = await this.recognitionModel.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $match: { companyValues: { $exists: true, $ne: [] } } },
      { $unwind: '$companyValues' },
      {
        $group: {
          _id: '$companyValues',
          totalRecognitions: { $sum: 1 },
          totalCoinsGiven: { $sum: { $sum: '$receivers.coinAmount' } },
        },
      },
      {
        $project: {
          _id: 0,
          companyValue: '$_id',
          totalRecognitions: 1,
          totalCoinsGiven: 1,
        },
      },
      { $sort: { totalRecognitions: -1 } },
    ]);

    return {
      data: {
        analytics: result,
        timeFrame:
          startDate || endDate
            ? { startDate: startDate || null, endDate: endDate || null }
            : 'All Time',
      },
      status: 200,
      message:
        result.length > 0
          ? 'Success'
          : 'No recognitions found for the given period.',
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

  async getTotalCoinAndRecognition(startDate?: Date, endDate?: Date) {
    const matchStage: any = {};

    if (startDate) {
      matchStage.createdAt = { $gte: new Date(startDate) };
    }

    if (endDate) {
      matchStage.createdAt = {
        ...matchStage.createdAt,
        $lte: new Date(endDate),
      };
    }

    // Calculate Current Period Stats
    const currentTotals = await this.recognitionModel.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: null,
          totalRecognitions: { $sum: 1 },
          totalCoinsGiven: { $sum: { $sum: '$receivers.coinAmount' } },
        },
      },
    ]);

    const currentStats = currentTotals[0] || {
      totalRecognitions: 0,
      totalCoinsGiven: 0,
    };

    // Automatically calculate previous period based on duration
    let previousStartDate, previousEndDate;

    if (startDate && endDate) {
      const durationMs =
        new Date(endDate).getTime() - new Date(startDate).getTime();
      previousEndDate = new Date(startDate);
      previousStartDate = new Date(previousEndDate.getTime() - durationMs);
    } else if (endDate) {
      const durationMs = new Date(endDate).getTime() - new Date().getTime();
      previousEndDate = new Date(endDate);
      previousStartDate = new Date(previousEndDate.getTime() - durationMs);
    }

    const prevMatchStage: any = {};
    if (previousStartDate) {
      prevMatchStage.createdAt = { $gte: previousStartDate };
    }
    if (previousEndDate) {
      prevMatchStage.createdAt = {
        ...prevMatchStage.createdAt,
        $lte: previousEndDate,
      };
    }

    // Calculate Previous Period Stats
    const previousTotals = await this.recognitionModel.aggregate([
      ...(Object.keys(prevMatchStage).length > 0
        ? [{ $match: prevMatchStage }]
        : []),
      {
        $group: {
          _id: null,
          totalRecognitions: { $sum: 1 },
          totalCoinsGiven: { $sum: { $sum: '$receivers.coinAmount' } },
        },
      },
    ]);

    const previousStats = previousTotals[0] || {
      totalRecognitions: 0,
      totalCoinsGiven: 0,
    };

    // Function to calculate percentage change
    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100; // If no previous data, assume 100% increase
      return ((current - previous) / previous) * 100;
    };

    const recognitionChange = calculatePercentageChange(
      currentStats.totalRecognitions,
      previousStats.totalRecognitions,
    );

    const coinChange = calculatePercentageChange(
      currentStats.totalCoinsGiven,
      previousStats.totalCoinsGiven,
    );

    return {
      status: 200,
      message: currentStats.totalRecognitions > 0 ? 'Success' : 'No data found',
      data: {
        totalRecognitions: currentStats.totalRecognitions,
        totalCoinsGiven: currentStats.totalCoinsGiven,
        percentageChange: {
          recognitions: recognitionChange.toFixed(2) + '%',
          coins: coinChange.toFixed(2) + '%',
        },
        timeFrame:
          startDate || endDate
            ? { startDate: startDate || null, endDate: endDate || null }
            : 'All Time',
      },
    };
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

      if (recognition.isAuto) {
        throw new BadRequestException(
          'Cannot delete auto-generated recognitions through this endpoint',
        );
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
              status: TransactionStatus.REVERSED,
            },
            session,
          );
        }

        const totalCoinAmount = claim.receivers.reduce(
          (sum, receiver) => sum + receiver.amount,
          0,
        );

        await this.walletService.incrementGiveableBalance(
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

  async getPostMetrics(startDate?: Date, endDate?: Date) {
    const matchStage: PipelineStage.Match = {
      $match: {
        ...(startDate && endDate
          ? {
              createdAt: {
                $gte: startDate,
                $lte: endDate,
              },
            }
          : {}),
      },
    };

    const pipeline: PipelineStage[] = [
      matchStage,

      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          totalPosts: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },

      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
            },
          },
          totalPosts: 1,
        },
      },
    ];

    const result = await this.recognitionModel.aggregate(pipeline);
    return result;
  }
}
