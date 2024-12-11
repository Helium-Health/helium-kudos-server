import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Recognition, RecognitionDocument } from './schema/Recognition.schema';
import { CreateRecognitionDto } from './dto/CreateRecognition.dto';
import { UserRecognitionService } from 'src/user-recognition/user-recognition.service';
import { UserRecognitionRole } from 'src/user-recognition/schema/UserRecognition.schema';
import { UsersService } from 'src/users/users.service';
import { WalletService } from 'src/wallet/wallet.service';
import { CompanyValues } from 'src/constants/companyValues';
import { Reaction } from 'src/reactions/schema/reactions.schema';
import { EntityType } from 'src/transaction/schema/Transaction.schema';
import { MilestoneType } from 'src/milestone/schema/Milestone.schema';
import { ClaimService } from 'src/claim/claim.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { RecognitionGateway } from './recognition.gateway';

@Injectable()
export class RecognitionService {
  constructor(
    @Inject(RecognitionGateway) private recognitionGateway: RecognitionGateway,
    @InjectModel(Recognition.name)
    private readonly recognitionModel: Model<Recognition>,
    private readonly userRecognitionService: UserRecognitionService,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
    private readonly claimService: ClaimService,
    private readonly transactionService: TransactionService,
  ) {}

  async createRecognition(
    senderId: string,
    { receivers, message, companyValues = [] }: CreateRecognitionDto,
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

      await this.claimService.claimCoin(
        {
          senderId: new Types.ObjectId(senderId),
          receivers: receivers.map((r) => ({
            receiverId: new Types.ObjectId(r.receiverId),
            amount: r.coinAmount ?? 0,
          })),
          recognitionId: newRecognition._id,
        },
        session,
      );

      await session.commitTransaction();
      this.recognitionGateway.notifyClients({
        message: `Recognition created: ${message}`,
        senderId,
        receivers: receivers.map((r) => ({
          receiverId: new Types.ObjectId(r.receiverId),
          amount: r.coinAmount ?? 0,
        })),
        companyValues,
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
        coinAmount,
        isAuto: true,
        milestoneType,
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

  // async getAllRecognitions(page: number, limit: number, userId?: string) {
  //   const skip = (page - 1) * limit;

  //   // Match filter for userId, if provided
  //   const matchFilter: Record<string, any> = {};
  //   if (userId) {
  //     matchFilter.$or = [
  //       { senderId: new Types.ObjectId(userId) },
  //       { 'receivers.receiverId': new Types.ObjectId(userId) },
  //     ];
  //   }

  //   const [recognitions, totalCount] = await Promise.all([
  //     this.recognitionModel.aggregate([
  //       { $match: matchFilter }, // Apply match filter based on userId
  //       {
  //         $sort: { createdAt: -1 },
  //       },
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'senderId',
  //           foreignField: '_id',
  //           as: 'sender',
  //         },
  //       },
  //       {
  //         $addFields: {
  //           sender: { $arrayElemAt: ['$sender', 0] },
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'userrecognitions',
  //           localField: '_id',
  //           foreignField: 'recognitionId',
  //           as: 'userRecognitions',
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'userRecognitions.userId',
  //           foreignField: '_id',
  //           as: 'receivers',
  //         },
  //       },
  //       // Lookup for reactions associated with the recognition
  //       {
  //         $lookup: {
  //           from: 'reactions',
  //           let: { recognitionId: '$_id' },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: { $eq: ['$recognitionId', '$$recognitionId'] },
  //               },
  //             },
  //             {
  //               $lookup: {
  //                 from: 'users',
  //                 localField: 'userId',
  //                 foreignField: '_id',
  //                 as: 'user',
  //               },
  //             },
  //             { $unwind: '$user' },
  //             {
  //               $group: {
  //                 _id: '$shortcodes',
  //                 users: { $push: '$user.name' }, // Collect user names who reacted
  //                 count: { $sum: 1 }, // Count reactions per shortcode
  //               },
  //             },
  //             {
  //               $project: {
  //                 _id: 0,
  //                 shortcode: '$_id', // Rename _id to shortcode for clarity
  //                 users: 1,
  //                 count: 1,
  //               },
  //             },
  //           ],
  //           as: 'reactions',
  //         },
  //       },
  //       {
  //         $project: {
  //           _id: 1,
  //           message: 1,
  //           coinAmount: 1,
  //           companyValues: 1,
  //           createdAt: 1,
  //           isAuto: 1, // Include isAuto field
  //           sender: {
  //             _id: '$sender._id',
  //             name: '$sender.name',
  //             picture: '$sender.picture',
  //           },
  //           receivers: {
  //             $map: {
  //               input: {
  //                 $filter: {
  //                   input: '$receivers',
  //                   as: 'receiver',
  //                   cond: { $ne: ['$$receiver._id', '$sender._id'] },
  //                 },
  //               },
  //               as: 'receiver',
  //               in: {
  //                 _id: '$$receiver._id',
  //                 name: '$$receiver.name',
  //                 picture: '$$receiver.picture',
  //               },
  //             },
  //           },
  //           commentCount: { $size: { $ifNull: ['$comments', []] } },
  //           reactions: 1, // Include reactions in the final output
  //         },
  //       },
  //       { $skip: skip },
  //       { $limit: limit },
  //     ]),
  //     // Count total recognitions with the same filter
  //     this.recognitionModel.countDocuments(matchFilter),
  //   ]);

  //   return {
  //     data: recognitions,
  //     meta: {
  //       totalCount,
  //       page,
  //       limit,
  //       totalPages: Math.ceil(totalCount / limit),
  //     },
  //   };
  // }

  async getAllRecognitions(
    page: number,
    limit: number,
    userId?: string,
    role?: string,
  ) {
    // Validate input
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
          $lookup: {
            from: 'userrecognitions',
            localField: '_id',
            foreignField: 'recognitionId',
            as: 'userRecognitions',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userRecognitions.userId',
            foreignField: '_id',
            as: 'receivers',
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
          $project: {
            _id: 1,
            message: 1,
            coinAmount: 1,
            companyValues: 1,
            createdAt: 1,
            isAuto: 1,
            sender: {
              _id: '$sender._id',
              name: '$sender.name',
              picture: '$sender.picture',
            },
            receivers: {
              $map: {
                input: {
                  $filter: {
                    input: '$receivers',
                    as: 'receiver',
                    cond: { $ne: ['$$receiver._id', '$sender._id'] },
                  },
                },
                as: 'receiver',
                in: {
                  _id: '$$receiver._id',
                  name: '$$receiver.name',
                  picture: '$$receiver.picture',
                },
              },
            },
            commentCount: { $size: { $ifNull: ['$comments', []] } },
            reactions: 1,
          },
        },
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
          receiverId: '$_id',
          recognitionCount: 1,
          user: {
            _id: '$user._id',
            email: '$user.email',
            name: '$user.name',
            role: '$user.role',
            picture: '$user.picture',
            verified: '$user.verified',
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
}
