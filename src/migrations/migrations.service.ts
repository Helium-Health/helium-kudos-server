import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Recognition } from 'src/recognition/schema/Recognition.schema';
import { Comment } from 'src/comment/schema/comment.schema';

@Injectable()
export class MigrationService implements OnModuleInit {
  constructor(
    @InjectModel('Comment') private commentModel: Model<Comment>,
    @InjectModel('Recognition') private recognitionModel: Model<Recognition>,
  ) {}

  async onModuleInit() {
    console.log('Starting migration...');
    await this.migrateCommentGiphyUrls();
    await this.migrateRecognitionGiphyUrls();
    console.log('Migration completed.');

    console.log('Starting cleanup for empty strings...');
    await this.cleanUpEmptyStringsInGiphyUrls();
    console.log('Cleanup completed.');
  }

  async migrateCommentGiphyUrls() {
    await this.commentModel.updateMany({ giphyUrl: { $type: 'string' } }, [
      {
        $set: {
          giphyUrl: {
            $cond: {
              if: { $eq: [{ $type: '$giphyUrl' }, 'string'] },
              then: [{ $toString: '$giphyUrl' }],
              else: '$giphyUrl',
            },
          },
        },
      },
    ]);
  }

  async migrateRecognitionGiphyUrls() {
    await this.recognitionModel.updateMany({ giphyUrl: { $type: 'string' } }, [
      {
        $set: {
          giphyUrl: {
            $cond: {
              if: { $eq: [{ $type: '$giphyUrl' }, 'string'] },
              then: [{ $toString: '$giphyUrl' }],
              else: '$giphyUrl',
            },
          },
        },
      },
    ]);
  }


  async cleanUpEmptyStringsInGiphyUrls() {
    await this.commentModel.updateMany(
      { giphyUrl: { $exists: true, $type: 'array' } },
      [
        {
          $set: {
            giphyUrl: {
              $filter: {
                input: '$giphyUrl',
                as: 'url',
                cond: { $ne: ['$$url', ''] },
              },
            },
          },
        },
      ],
    );

    await this.recognitionModel.updateMany(
      { giphyUrl: { $exists: true, $type: 'array' } },
      [
        {
          $set: {
            giphyUrl: {
              $filter: {
                input: '$giphyUrl',
                as: 'url',
                cond: { $ne: ['$$url', ''] },
              },
            },
          },
        },
      ],
    );
  }
}
