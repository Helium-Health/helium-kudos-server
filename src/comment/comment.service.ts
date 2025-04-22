import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { RecognitionService } from 'src/recognition/recognition.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/CreateComment.dto';
import { Comment } from './schema/comment.schema';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @Inject(forwardRef(() => RecognitionService))
    private readonly recognitionService: RecognitionService,
  ) {}

  async onModuleInit() {
    await this.migrateCommentGiphyUrls();
  }

  async migrateCommentGiphyUrls() {
    const session = await this.commentModel.db.startSession();
    session.startTransaction();

    try {
      const comments = await this.commentModel
        .find({ giphyUrl: { $exists: true, $not: { $size: 0 } } })
        .lean();

      let updatedCount = 0;

      for (const comment of comments) {
        const giphyMedia = comment.giphyUrl.map((url: string) => ({
          url,
          type: 'giphy',
        }));

        const updatedMedia = [...(comment.media || []), ...giphyMedia];

        await this.commentModel.updateOne(
          { _id: comment._id },
          {
            $set: { media: updatedMedia },
            $unset: { giphyUrl: '' },
          },
          { session },
        );

        updatedCount++;
      }

      await session.commitTransaction();
      Logger.log(
        `Comment migration completed. Updated ${updatedCount} comments.`,
      );
    } catch (error) {
      await session.abortTransaction();
      Logger.error('Migration failed:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async addComment(
    userId: Types.ObjectId,
    { recognitionId, content, media }: CreateCommentDto,
  ) {
    const session = await this.commentModel.db.startSession();
    session.startTransaction();

    try {
      const recognitionExists =
        await this.recognitionService.getRecognitionById(
          new Types.ObjectId(recognitionId),
          { session },
        );

      if (!recognitionExists) {
        throw new NotFoundException('Recognition not found');
      }

      const validMedia = Array.isArray(media)
        ? media.filter((m) => m.url && m.type)
        : [];

      const comment = new this.commentModel({
        userId: new Types.ObjectId(userId),
        recognitionId: new Types.ObjectId(recognitionId),
        content,
        media: validMedia,
      });

      await comment.save({ session });

      await this.recognitionService.addCommentToRecognition(
        new Types.ObjectId(recognitionId),
        comment._id,
        session,
      );

      await session.commitTransaction();
      return comment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getCommentsByRecognition(
    recognitionId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const recognitionObjectId = new Types.ObjectId(recognitionId);

    const [comments, total] = await Promise.all([
      this.commentModel
        .find({ recognitionId: recognitionObjectId })
        .populate('userId', 'name picture')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: 1 }),

      this.commentModel.countDocuments({ recognitionId: recognitionObjectId }),
    ]);

    return {
      data: comments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateComment(
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    userId: Types.ObjectId,
  ) {
    const comment = await this.commentModel.findOneAndUpdate(
      { _id: commentId, userId },
      {
        ...(updateCommentDto.content && { content: updateCommentDto.content }),
        ...(updateCommentDto.giphyUrl && {
          giphyUrl: updateCommentDto.giphyUrl,
        }),
      },
      { new: true },
    );
    if (!comment) {
      throw new NotFoundException(
        'Comment not found or user not authorized to update',
      );
    }

    return comment;
  }

  async deleteComment(commentId: Types.ObjectId, userId: Types.ObjectId) {
    const comment = await this.commentModel.findOneAndDelete({
      _id: commentId,
      userId,
    });
    if (!comment) {
      throw new NotFoundException(
        'Comment not found or user not authorized to delete',
      );
    }
    await this.recognitionService.removeCommentFromRecognition(
      new Types.ObjectId(comment.recognitionId),
      commentId,
    );
    return { message: 'Comment deleted successfully' };
  }
  async deleteMany(
    recognitionId: Types.ObjectId,
    session: ClientSession,
  ): Promise<{ deletedCount: number }> {
    return this.commentModel.deleteMany(
      { recognitionId: recognitionId },
      { session },
    );
  }
}
