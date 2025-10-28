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
          totalVotes: 0,
          expiresAt,
        },
      ],
      { session },
    );

    const optionDocs = dto.options.map((text, index) => ({
      pollId: poll[0]._id,
      optionText: text,
      votesCount: 0,
      position: index,
    }));

    await this.pollOptionModel.create(optionDocs, { session });

    return poll[0];
  }

  async getPoll(recognitionId: Types.ObjectId, userId?: Types.ObjectId) {
    const poll = await this.pollModel.findOne({ recognitionId }).lean();
    if (!poll) throw new NotFoundException('Poll not found');

    const options = await this.pollOptionModel
      .find({ pollId: poll._id })
      .sort({ position: 1 })
      .lean();

    let userVote = null;
    if (userId) {
      userVote = await this.pollVoteModel
        .findOne({ pollId: poll._id, userId })
        .lean();
    }

    return this.formatPoll(poll, options, userVote?.optionId);
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
    const session = await this.pollModel.db.startSession();
    session.startTransaction();

    try {
      const poll = await this.pollModel
        .findById(pollId)
        .session(session)
        .lean();
      if (!poll) throw new NotFoundException('Poll not found');
      if (poll.expiresAt && poll.expiresAt < new Date())
        throw new ForbiddenException('Poll has expired');

      const targetOption = await this.pollOptionModel
        .findOne({ _id: optionId, pollId })
        .session(session)
        .lean();
      if (!targetOption) throw new BadRequestException('Invalid optionId');

      const existingVote = await this.pollVoteModel
        .findOne({ pollId, userId })
        .session(session);

      if (existingVote) {
        // User already voted - check if switching
        if (existingVote.optionId.equals(optionId)) {
          // Voting for same option - no change needed
          await session.commitTransaction();
          return this.getPoll(poll.recognitionId, userId);
        }

        // User switching vote
        await Promise.all([
          // Decrement old option
          this.pollOptionModel.updateOne(
            { _id: existingVote.optionId },
            { $inc: { votesCount: -1 } },
            { session },
          ),
          // Increment new option
          this.pollOptionModel.updateOne(
            { _id: optionId },
            { $inc: { votesCount: 1 } },
            { session },
          ),
          // Update vote record
          this.pollVoteModel.updateOne(
            { pollId, userId },
            { $set: { optionId } },
            { session },
          ),
        ]);
      } else {
        // New vote
        await Promise.all([
          // Increment option count
          this.pollOptionModel.updateOne(
            { _id: optionId },
            { $inc: { votesCount: 1 } },
            { session },
          ),
          // Increment poll total
          this.pollModel.updateOne(
            { _id: pollId },
            { $inc: { totalVotes: 1 } },
            { session },
          ),
          // Create vote record
          this.pollVoteModel.create([{ pollId, userId, optionId }], {
            session,
          }),
        ]);
      }

      await session.commitTransaction();

      return this.getPoll(poll.recognitionId, userId);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async removeVote(pollId: Types.ObjectId, userId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(pollId))
      throw new BadRequestException('Invalid pollId');
    if (!Types.ObjectId.isValid(userId))
      throw new BadRequestException('Invalid userId');

    const session = await this.pollModel.db.startSession();
    session.startTransaction();

    try {
      const poll = await this.pollModel
        .findById(pollId)
        .session(session)
        .lean();
      if (!poll) throw new NotFoundException('Poll not found');
      if (poll.expiresAt && poll.expiresAt < new Date())
        throw new ForbiddenException('Poll has expired');

      const existingVote = await this.pollVoteModel
        .findOne({ pollId, userId })
        .session(session);

      if (!existingVote) {
        throw new BadRequestException('User has not voted on this poll');
      }

      await Promise.all([
        this.pollOptionModel.updateOne(
          { _id: existingVote.optionId },
          { $inc: { votesCount: -1 } },
          { session },
        ),
        this.pollModel.updateOne(
          { _id: pollId },
          { $inc: { totalVotes: -1 } },
          { session },
        ),
        this.pollVoteModel.deleteOne({ pollId, userId }, { session }),
      ]);

      await session.commitTransaction();

      return this.getPoll(poll.recognitionId, userId);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async formatPollWithUserVote(
    pollId: Types.ObjectId,
    pollDoc: any,
    options: any[],
    userId: Types.ObjectId | null,
  ) {
    let userVote = null;

    if (userId) {
      userVote = await this.pollVoteModel.findOne({ pollId, userId }).lean();
    }

    return this.formatPoll(pollDoc, options, userVote?.optionId);
  }

  formatPoll(poll: any, options: any[], userVotedOptionId?: Types.ObjectId) {
    if (!poll || !options) return null;

    const totalVotes = poll.totalVotes || 0;

    return {
      id: poll._id,
      question: poll.question,
      expiresAt: poll.expiresAt,
      totalVotes,
      options: options.map((opt) => ({
        optionId: opt._id.toString(),
        text: opt.optionText,
        votesCount: opt.votesCount,
        percentage:
          totalVotes > 0
            ? +((opt.votesCount / totalVotes) * 100).toFixed(1)
            : 0,
      })),
      hasVoted: !!userVotedOptionId,
      votedOptionId: userVotedOptionId ? userVotedOptionId.toString() : null,
    };
  }
}
