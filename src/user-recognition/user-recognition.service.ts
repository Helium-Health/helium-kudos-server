import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
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
}
