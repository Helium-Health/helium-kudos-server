import {
  BadRequestException,
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
import { TransactionService } from 'src/transaction/transaction.service';
import { EntityType } from 'src/schemas/Transaction.schema';
import { Reaction } from 'src/reactions/schema/reactions.schema';

@Injectable()
export class RecognitionService {
  constructor(
    @InjectModel(Recognition.name) private recognitionModel: Model<Recognition>,
    private userRecognitionService: UserRecognitionService,
    private transactionService: TransactionService,
    private walletService: WalletService,
    private usersService: UsersService,
  ) {}

  async createRecognition(
    senderId: string,
    {
      receiverIds,
      message,
      coinAmount = 0,
      companyValues = [],
    }: CreateRecognitionDto,
  ) {
    const invalidValues = companyValues.filter(
      (value) => !Object.values(CompanyValues).includes(value),
    );

    if (receiverIds.length === 0) {
      throw new BadRequestException(
        'At least one receiver is required for recognition',
      );
    }

    if (invalidValues.length > 0) {
      throw new BadRequestException(
        `Invalid company values: ${invalidValues.join(', ')}`,
      );
    }

    if (receiverIds.includes(senderId)) {
      throw new BadRequestException(
        'Sender cannot be a receiver of the recognition',
      );
    }

    const areValidUsers = await this.usersService.validateUserIds(receiverIds);

    if (!areValidUsers) {
      throw new BadRequestException('One or more receiver IDs are invalid');
    }

    const totalCoinAmount = coinAmount * receiverIds.length;

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
      // Create the recognition
      const newRecognition = new this.recognitionModel({
        senderId: new Types.ObjectId(senderId),
        message,
        coinAmount,
        companyValues: companyValues,
      });
      await newRecognition.save({ session });

      // Create UserRecognition entries
      const userRecognitions = [
        // TODO: deprecate sender detail in userRecognition table and update recognition aggregation
        // {
        //   userId: new Types.ObjectId(senderId),
        //   recognitionId: newRecognition._id,
        //   role: UserRecognitionRole.SENDER,
        // },
        ...receiverIds.map((userId) => ({
          userId: new Types.ObjectId(userId),
          recognitionId: newRecognition._id,
          role: UserRecognitionRole.RECEIVER,
        })),
      ];

      await this.userRecognitionService.createMany(userRecognitions, session);

      if (coinAmount > 0) {
        this.claimCoin(
          {
            senderId: new Types.ObjectId(senderId),
            receiverIds,
            coinAmount,
            recognitionId: newRecognition._id,
          },
          session,
        );
      }

      await session.commitTransaction();
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

  async claimCoin(
    {
      senderId,
      receiverIds,
      coinAmount,
      recognitionId,
    }: {
      senderId: Types.ObjectId;
      coinAmount: number;
      receiverIds: string[];
      recognitionId: Types.ObjectId;
    },
    session: ClientSession,
  ) {
    const totalCoinAmount = coinAmount * receiverIds.length;

    // Deduct coins from sender
    await this.walletService.deductCoins(senderId, totalCoinAmount, session);

    for (const receiverId of receiverIds) {
      // await this.walletService.incrementEarnedBalance(
      //   new Types.ObjectId(receiverId),
      //   coinAmount,
      //   session,
      // );
      await this.transactionService.recordDebitTransaction(
        {
          senderId: new Types.ObjectId(senderId),
          receiverId: new Types.ObjectId(receiverId),
          amount: coinAmount,
          entityId: recognitionId,
          entityType: EntityType.RECOGNITION,
        },
        session,
      );
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

  async getAllRecognitions(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [recognitions, totalCount] = await Promise.all([
      this.recognitionModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'sender',
          },
        },
        { $unwind: '$sender' },
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
        // Lookup for reactions associated with the recognition
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
                  users: { $push: '$user.name' }, // Collect user names who reacted
                  count: { $sum: 1 }, // Count reactions per shortcode
                },
              },
              {
                $project: {
                  _id: 0,
                  shortcode: '$_id', // Rename _id to shortcode for clarity
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
            isAuto: 1, // Include isAuto field
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
            reactions: 1, // Include reactions in the final output
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]),
      this.recognitionModel.countDocuments(),
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

  async getRecognitionsSortedByRecent(): Promise<Recognition[]> {
    return this.recognitionModel.find().sort({ createdAt: -1 }).exec();
  }
}
