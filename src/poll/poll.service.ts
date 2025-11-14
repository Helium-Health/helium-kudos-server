import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Poll } from './schema/poll.schema';
import { PollOption } from './schema/poll-option.schema';
import { PollVote } from './schema/poll-vote.schema';
import { ClientSession, Model, Types } from 'mongoose';
import { RecognitionService } from 'src/recognition/recognition.service';
import { CreatePollDto } from './dto/poll.dto';

@Injectable()
export class PollService {
  constructor(
    @InjectModel(Poll.name) private pollModel: Model<Poll>,
    @InjectModel(PollOption.name) private pollOptionModel: Model<PollOption>,
    @InjectModel(PollVote.name) private pollVoteModel: Model<PollVote>,
    @Inject(forwardRef(() => RecognitionService))
    private readonly recognitionService: RecognitionService,
  ) {}

  async createPoll(
    dto: CreatePollDto,
    recognitionId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<Poll> {
    const { days, hours, minutes } = dto.pollDuration;
    const expiresAt = new Date(
      Date.now() + ((days * 24 + hours) * 60 + minutes) * 60 * 1000,
    );

    if (expiresAt <= new Date()) {
      throw new BadRequestException('Expiry time must be in the future');
    }

    const poll = await this.pollModel.create(
      [
        {
          recognitionId,
          question: dto.question,
          hide: dto.hide,
          expiresAt,
        },
      ],
      { session },
    );

    const optionDocs = dto.options.map((text, index) => ({
      pollId: poll[0]._id,
      optionText: text,
      position: index,
    }));

    await this.pollOptionModel.create(optionDocs, { session });

    return poll[0];
  }

  async vote(
    pollId: Types.ObjectId,
    userId: Types.ObjectId,
    optionIdStr: string,
  ) {
    if (!Types.ObjectId.isValid(pollId))
      throw new BadRequestException('Invalid pollId');
    if (!Types.ObjectId.isValid(userId))
      throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(optionIdStr))
      throw new BadRequestException('Invalid optionId');

    const optionId = new Types.ObjectId(optionIdStr);

    const poll = await this.pollModel.findById(pollId).lean();
    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.expiresAt && poll.expiresAt < new Date())
      throw new ForbiddenException('Poll has expired');

    const optionExists = await this.pollOptionModel.exists({
      _id: optionId,
      pollId,
    });
    if (!optionExists) throw new BadRequestException('Invalid optionId');

    await this.pollVoteModel.updateOne(
      { pollId, userId },
      { $set: { optionId } },
      { upsert: true },
    );

    return this.getPollWithCounts(pollId, userId);
  }

  async removeVote(pollId: Types.ObjectId, userId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(pollId))
      throw new BadRequestException('Invalid pollId');
    if (!Types.ObjectId.isValid(userId))
      throw new BadRequestException('Invalid userId');

    const poll = await this.pollModel.findById(pollId).lean();
    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.expiresAt && poll.expiresAt < new Date())
      throw new ForbiddenException('Poll has expired');

    const result = await this.pollVoteModel.deleteOne({ pollId, userId });

    if (result.deletedCount === 0) {
      throw new BadRequestException('User has not voted on this poll');
    }

    return this.getPollWithCounts(pollId, userId);
  }

  async getPollWithCounts(pollId: Types.ObjectId, userId?: Types.ObjectId) {
    const poll = await this.pollModel.findById(pollId).lean();
    if (!poll) throw new NotFoundException('Poll not found');

    const optionsWithCounts = await this.pollOptionModel.aggregate([
      { $match: { pollId } },
      {
        $lookup: {
          from: 'pollvotes',
          localField: '_id',
          foreignField: 'optionId',
          as: 'votes',
        },
      },
      {
        $addFields: {
          votesCount: { $size: '$votes' },
          hasUserVote: userId ? { $in: [userId, '$votes.userId'] } : false,
        },
      },
      {
        $project: {
          _id: 1,
          optionText: 1,
          position: 1,
          votesCount: 1,
          hasUserVote: 1,
          hide: 1,
        },
      },
      { $sort: { position: 1 } },
    ]);

    const totalVotes = optionsWithCounts.reduce(
      (sum, opt) => sum + opt.votesCount,
      0,
    );

    const userVotedOption = optionsWithCounts.find((opt) => opt.hasUserVote);

    return {
      id: poll._id,
      question: poll.question,
      expiresAt: poll.expiresAt,
      totalVotes,
      options: optionsWithCounts.map((opt) => ({
        optionId: opt._id.toString(),
        text: opt.optionText,
        votesCount: opt.votesCount,
        percentage:
          totalVotes > 0
            ? +((opt.votesCount / totalVotes) * 100).toFixed(1)
            : 0,
      })),
      hide: poll.hide,
      hasVoted: !!userVotedOption,
      votedOptionId: userVotedOption ? userVotedOption._id.toString() : null,
      voterId: userId ? userId.toString() : null,
    };
  }
}
