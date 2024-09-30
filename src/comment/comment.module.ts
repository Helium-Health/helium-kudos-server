import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema } from './schema/comment.schema';
import { RecognitionModule } from 'src/recognition/recognition.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
    RecognitionModule,
  ],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
