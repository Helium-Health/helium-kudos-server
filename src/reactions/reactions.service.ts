import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Reaction } from './schema/reactions.schema';
import { UsersService } from 'src/users/users.service';
import { RecognitionService } from 'src/recognition/recognition.service';

@Injectable()
export class ReactionService {
  constructor(
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
    private userService: UsersService,
    private recognitionService: RecognitionService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async addReaction(
    recognitionId: Types.ObjectId,
    userId: Types.ObjectId,
    shortcodes: string,
  ): Promise<Reaction> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const recognition = await this.recognitionService.findById(recognitionId);
      if (!recognition) {
        throw new NotFoundException('Recognition not found');
      }

      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const existingReaction = await this.reactionModel.findOne({
        userId: new Types.ObjectId(userId),
        recognitionId: new Types.ObjectId(recognitionId),
        shortcodes,
      });

      if (existingReaction) {
        throw new ConflictException('User has already added this reaction');
      }

      const newReaction = new this.reactionModel({
        userId: new Types.ObjectId(userId),
        recognitionId: new Types.ObjectId(recognitionId),
        shortcodes,
      });

      await newReaction.save({ session });

      await this.recognitionService.addReactionToRecognition(
        recognitionId,
        newReaction,
        session,
      );

      await session.commitTransaction();

      return newReaction;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async deleteReaction(
    recognitionId: Types.ObjectId,
    userId: Types.ObjectId,
    shortcodes: string,
  ): Promise<void> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const reaction = await this.reactionModel
        .findOne({
          recognitionId: new Types.ObjectId(recognitionId),
          userId: new Types.ObjectId(userId),
          shortcodes,
        })
        .session(session);
      if (!reaction) {
        throw new NotFoundException('Reaction not found');
      }

      await this.recognitionService.removeReactionFromRecognition(
        reaction.recognitionId as Types.ObjectId,
        reaction._id as Types.ObjectId,
        session,
      );

      await this.reactionModel
        .deleteOne({ _id: reaction._id })
        .session(session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
