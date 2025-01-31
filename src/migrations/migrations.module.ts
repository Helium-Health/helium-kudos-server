import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MigrationService } from './migrations.service';
import { Comment, CommentSchema } from 'src/comment/schema/comment.schema';
import {
  Recognition,
  RecognitionSchema,
} from 'src/recognition/schema/Recognition.schema';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.LOCAL_MONGODB_URI),
    MongooseModule.forFeature([
      { name: 'Comment', schema: CommentSchema },
      { name: 'Recognition', schema: RecognitionSchema },
    ]),
  ],
  providers: [MigrationService],
})
export class AppModule {}
