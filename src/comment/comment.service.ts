import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RecognitionService } from 'src/recognition/recognition.service';
import { CreateCommentDto } from './dto/CreateComment.dto';
import { Comment } from './schema/comment.schema';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    private recognitionService: RecognitionService,
    // private s3Service: S3Service, // Optional for image upload handling
  ) {}

  async addComment(
    userId: string,
    { recognitionId, content, giphyUrl }: CreateCommentDto,
    file?: Express.Multer.File,
  ) {
    if (file && file.size > 2.5 * 1024 * 1024) {
      throw new BadRequestException('Image size exceeds the 2.5MB limit');
    }
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

      let imageUrl: string | undefined;
      if (file) {
        // Upload image to cloud storage and get URL
        // imageUrl = await this.s3Service.uploadFile(file);
      }

      const comment = new this.commentModel({
        userId: new Types.ObjectId(userId),
        recognitionId: new Types.ObjectId(recognitionId),
        content,
        giphyUrl,
        // imageUrl,
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

  async getCommentsByRecognition(recognitionId: string) {
    return this.commentModel
      .find({ recognitionId: new Types.ObjectId(recognitionId) })
      .populate('userId', 'name picture');
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
}
