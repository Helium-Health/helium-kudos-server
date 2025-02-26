import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { UserRecognition } from './schema/UserRecognition.schema';

@Injectable()
export class UserRecognitionService {
  private readonly logger = new Logger(UserRecognitionService.name);
  constructor(
    @InjectModel(UserRecognition.name)
    private userRecognitionModel: Model<UserRecognition>,
  ) {}

  async createMany(
    userRecognitions: Partial<UserRecognition>[],
    session: ClientSession,
  ) {
    return this.userRecognitionModel.insertMany(userRecognitions, { session });
  }

  async create(userRecognition: UserRecognition, session: ClientSession) {
    const newUserRecognition = new this.userRecognitionModel(userRecognition);
    return newUserRecognition.save({ session });
  }

  // user-recognition.service.ts

  async updateUserRecognitions(
    emailMapping: Map<string, string>,
    session: ClientSession,
  ) {
    this.logger.log(
      `Starting UserRecognition update for ${emailMapping.size} users`,
    );

    try {
      for (const [newUserId, oldUserId] of emailMapping.entries()) {
        const oldIdObj = new Types.ObjectId(oldUserId);
        const newIdObj = new Types.ObjectId(newUserId);

        this.logger.log(
          `Updating UserRecognition: ${oldUserId} → ${newUserId}`,
        );

        const updateResult = await this.userRecognitionModel.updateMany(
          { userId: oldIdObj },
          { $set: { userId: newIdObj } },
          { session },
        );

        this.logger.log(
          `Updated ${updateResult.modifiedCount} UserRecognition records for userId=${oldUserId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error updating UserRecognition`, error.stack);
      throw error;
    }
  }
}
