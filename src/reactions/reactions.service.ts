import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
  ) {}

  async addReaction(
    recognitionId: Types.ObjectId,
    userId: Types.ObjectId,
    reactionType: string,
  ): Promise<Recognition> {
    // Validate the recognition using the recognitionService
    const recognition = await this.recognitionService.findById(recognitionId);
    if (!recognition) {
      throw new NotFoundException('Recognition not found');
    }

    // Validate the user who is reacting
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create the reaction, associating it with the user and recognition
    const newReaction = new this.reactionModel({
      userId,
      recognitionId,
      reactionType,
    });
    await newReaction.save();

    // Use recognitionService to update the recognition's reactions
    await this.recognitionService.addReactionToRecognition(
      recognitionId,
      newReaction,
    );

    return recognition;
  }
  async remove(id: Types.ObjectId): Promise<void> {
    const objectId = new Types.ObjectId(id);

    const reaction = await this.reactionModel.findByIdAndDelete(objectId);

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }
  }
}
