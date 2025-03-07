import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { UserRecognition } from './schema/UserRecognition.schema';

@Injectable()
export class UserRecognitionService {
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

  async deleteMany(
    recognitionId: Types.ObjectId,
    session: ClientSession,
  ): Promise<{ deletedCount: number }> {
    return this.userRecognitionModel.deleteMany(
      { recognitionId: recognitionId },
      { session },
    );
  }
}
