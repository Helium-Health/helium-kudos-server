import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Feedback, FeedbackDocument } from './schema/feedback.schema';
import { Model } from 'mongoose';
import { CreateFeedbackDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
  ) {}
  async createFeedback(
    createFeedbackDto: CreateFeedbackDto,
    userId,
  ): Promise<Feedback> {
    const feedback = new this.feedbackModel(createFeedbackDto, userId);
    return feedback.save();
  }

  async getFeedback(page: number = 1, limit: number = 10, category?: string) {
    page = Math.max(1, page);
    limit = Math.max(1, limit);

    const query: Record<string, any> = {};
    if (category) {
      query.category = category;
    }

    const totalDocuments = await this.feedbackModel.countDocuments(query);

    if (totalDocuments === 0) {
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalDocuments: 0,
        },
        message: 'No feedback found for the specified category or page.',
      };
    }

    const totalPages = Math.ceil(totalDocuments / limit);
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const feedbacks = await this.feedbackModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      data: feedbacks,
      pagination: {
        currentPage,
        totalPages,
        totalDocuments,
      },
      message: feedbacks.length
        ? 'Success'
        : `No feedback found for page ${currentPage}`,
    };
  }
}
