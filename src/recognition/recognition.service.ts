import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Recognition } from './schema/Recognition.schema';
import { CreateRecognitionDto } from './dto/CreateRecognition.dto';
import { UserRecognitionService } from 'src/user-recognition/user-recognition.service';
import { UserRecognitionRole } from 'src/user-recognition/schema/UserRecognition.schema';
import { UsersService } from 'src/users/users.service';
import { WalletService } from 'src/wallet/wallet.service';
import { CompanyValues } from 'src/constants/companyValues';

@Injectable()
export class RecognitionService {
  constructor(
    @InjectModel(Recognition.name) private recognitionModel: Model<Recognition>,
    private userRecognitionService: UserRecognitionService,
    private walletService: WalletService,
    private usersService: UsersService,
  ) {}

  async createRecognition(
    senderId: string,
    { receiverIds, message, coinAmount, companyValues }: CreateRecognitionDto,
  ) {
    const invalidValues = companyValues.filter(
      (value) => !Object.values(CompanyValues).includes(value),
    );

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
        {
          userId: new Types.ObjectId(senderId),
          recognitionId: newRecognition._id,
          role: UserRecognitionRole.SENDER,
        },
        ...receiverIds.map((userId) => ({
          userId: new Types.ObjectId(userId),
          recognitionId: newRecognition._id,
          role: UserRecognitionRole.RECEIVER,
        })),
      ];
      await this.userRecognitionService.createMany(userRecognitions, session);

      // Update receiver's coin bank
      for (const receiverId of receiverIds) {
        await this.walletService.incrementEarnedCoins(
          new Types.ObjectId(receiverId),
          coinAmount,
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

  async getAllRecognitions() {
    return this.recognitionModel.aggregate([
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
      {
        $project: {
          _id: 1,
          message: 1,
          coinAmount: 1,
          companyValues: 1,
          createdAt: 1,
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
        },
      },
    ]);
  }
}
