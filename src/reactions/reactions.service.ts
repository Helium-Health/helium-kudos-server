import { Injectable, NotFoundException } from '@nestjs/common';
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

  async deleteReaction(reactionId: Types.ObjectId): Promise<void> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Find the reaction by ID within the transaction
      const reaction = await this.reactionModel
        .findById(reactionId)
        .session(session);
      if (!reaction) {
        throw new NotFoundException('Reaction not found');
      }

      // Use recognitionService to unlink the reactionId from the recognition
      await this.recognitionService.removeReactionFromRecognition(
        reaction.recognitionId,
        reactionId,
        session, // Pass session to recognitionService for transaction handling
      );

      // Delete the reaction from the reaction document within the transaction
      await this.reactionModel.deleteOne({ _id: reactionId }).session(session);

      // Commit the transaction
      await session.commitTransaction();
    } catch (error) {
      // If any error occurs, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // async getReactionsByRecognitionId(
  //   recognitionId: Types.ObjectId,
  // ): Promise<any> {
  //   const reactions = await this.reactionModel.aggregate([
  //     {
  //       // Match reactions by the recognitionId
  //       $match: { recognitionId: new Types.ObjectId(recognitionId) },
  //     },
  //     {
  //       // Lookup to populate the user info from the User model
  //       $lookup: {
  //         from: 'users',
  //         localField: 'userId',
  //         foreignField: '_id',
  //         as: 'user',
  //       },
  //     },
  //     {
  //       // Unwind the user array (since lookup results in an array)
  //       $unwind: '$user',
  //     },
  //     {
  //       // Group by the shortcodes and accumulate user names
  //       $group: {
  //         _id: '$shortcodes',
  //         users: { $push: '$user.name' }, // Fetch the 'name' field from the User schema
  //         count: { $sum: 1 }, // Count the number of reactions per shortcode
  //       },
  //     },
  //     {
  //       // Rename _id to "shortcodes" for clarity in the result
  //       $project: {
  //         _id: 0,
  //         shortcodes: '$_id',
  //         users: 1,
  //         count: 1,
  //       },
  //     },
  //   ]);

  //   return { reactions };
  // }
}
