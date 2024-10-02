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

  // async addReaction(
  //   recognitionId: Types.ObjectId,
  //   userId: Types.ObjectId,
  //   reactionType: string,
  // ): Promise<Recognition> {
  //   // Validate the recognition using the recognitionService
  //   const recognition = await this.recognitionService.findById(recognitionId);
  //   if (!recognition) {
  //     throw new NotFoundException('Recognition not found');
  //   }

  //   // Validate the user who is reacting
  //   const user = await this.userService.findById(userId);
  //   if (!user) {
  //     throw new NotFoundException('User not found');
  //   }

  //   // Create the reaction, associating it with the user and recognition
  //   const newReaction = new this.reactionModel({
  //     userId,
  //     recognitionId,
  //     reactionType,
  //   });
  //   await newReaction.save();

  //   // Use recognitionService to update the recognition's reactions
  //   await this.recognitionService.addReactionToRecognition(
  //     recognitionId,
  //     newReaction,
  //   );

  //   return recognition;
  // }
  async addReaction(
    recognitionId: Types.ObjectId,
    userId: Types.ObjectId,
    reactionType: string,
  ): Promise<Recognition> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Step 1: Validate the recognition using recognitionService (outside transaction)
      const recognition = await this.recognitionService.findById(recognitionId);
      if (!recognition) {
        throw new NotFoundException('Recognition not found');
      }

      // Step 2: Validate the user using userService (outside transaction)
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Step 3: Create the reaction inside the transaction
      const newReaction = new this.reactionModel({
        userId,
        recognitionId,
        reactionType,
      });
      await newReaction.save({ session });

      // Step 4: Update the recognition's reactions inside the transaction
      await this.recognitionService.addReactionToRecognition(
        recognitionId,
        newReaction,
        session, // Pass the session to this method
      );

      // Step 5: Commit the transaction
      await session.commitTransaction();

      return recognition;
    } catch (error) {
      // Step 6: Abort the transaction if any error occurs
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession(); // End the session
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
}
