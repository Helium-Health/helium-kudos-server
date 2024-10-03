import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Recognition } from 'src/recognition/schema/Recognition.schema';
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
    reactionType: string,
  ): Promise<Recognition> {
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
        userId,
        recognitionId,
        reactionType,
      });
      await newReaction.save({ session });

      await this.recognitionService.addReactionToRecognition(
        recognitionId,
        newReaction,
        session,
      );

      await session.commitTransaction();

      return recognition;
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
      // Step 1: Find the reaction by ID within the transaction
      const reaction = await this.reactionModel
        .findById(reactionId)
        .session(session);
      if (!reaction) {
        throw new NotFoundException('Reaction not found');
      }

      // Step 2: Use recognitionService to unlink the reactionId from the recognition
      await this.recognitionService.removeReactionFromRecognition(
        reaction.recognitionId,
        reactionId,
        session, // Pass session to recognitionService for transaction handling
      );

      // Step 3: Delete the reaction from the reaction document within the transaction
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

  async getReactionsByRecognitionId(
    recognitionId: Types.ObjectId,
  ): Promise<any> {
    const reactions = await this.reactionModel.aggregate([
      { $match: { recognitionId } },

      // Lookup user details from the 'users' collection using userId in the reaction
      {
        $lookup: {
          from: 'users', // Name of the collection that holds user data
          localField: 'userId', // Field in Reaction model
          foreignField: '_id', // Field in User model
          as: 'user', // Output array containing user information
        },
      },

      // Unwind the user array to get individual user details
      { $unwind: '$user' },

      // Group by reactionType
      {
        $group: {
          _id: '$reactionType', // Group by reactionType
          users: { $push: '$user.name' }, // Collect user names
          count: { $sum: 1 }, // Count the number of reactions for each reactionType
        },
      },

      // Format the output
      {
        $project: {
          _id: 0, // Exclude the _id field
          reactionType: '$_id', // Name the grouped field as reactionType
          users: 1, // Include the list of users
          count: 1, // Include the count of reactions
        },
      },
    ]);

    return { reactions };
  }
}
