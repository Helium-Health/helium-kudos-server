import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Poll, PollDocument } from './schema/poll.schema';
import { ClientSession, Model, Types, Document } from 'mongoose';
import { RecognitionService } from 'src/recognition/recognition.service';
import { CreatePollDto, VotePollDto } from './dto/poll.dto';

@Injectable()
export class PollService {
  constructor(
    @InjectModel(Poll.name) private pollModel: Model<Poll>,
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

    if (expiresAt < new Date()) {
      throw new BadRequestException('Expiry time must be in the future');
    }

    const poll = new this.pollModel({
      recognitionId,
      question: dto.question,
      options: dto.options.map((text) => ({
        optionId: new Types.ObjectId().toString(),
        optionText: text,
        votes: [],
      })),
      expiresAt,
    });

    return poll.save({ session });
  }

  async getPoll(recognitionId: Types.ObjectId, userId: Types.ObjectId) {
    const poll = await this.pollModel.findOne({ recognitionId }).lean();
    if (!poll) throw new NotFoundException('Poll not found');

    return this.formatPoll(poll, userId);
  }

  async vote(pollId: Types.ObjectId, userId: Types.ObjectId, optionId: string) {
    if (!Types.ObjectId.isValid(pollId))
      throw new BadRequestException('Invalid pollId');
    if (!Types.ObjectId.isValid(userId))
      throw new BadRequestException('Invalid userId');

    const session = await this.pollModel.db.startSession();
    session.startTransaction();

    try {
      const poll = await this.pollModel.findById(pollId).session(session);
      if (!poll) throw new NotFoundException('Poll not found');
      if (poll.expiresAt && poll.expiresAt < new Date())
        throw new ForbiddenException('Poll has expired');

      const userObjId = new Types.ObjectId(userId);

      const currentIndex = poll.options.findIndex((opt) =>
        opt.votes.some((v) => v.equals(userObjId)),
      );
      const targetIndex = poll.options.findIndex(
        (opt) => opt.optionId === optionId,
      );
      if (targetIndex === -1) throw new BadRequestException('Invalid optionId');

      // User switching to another option
      if (currentIndex !== -1 && currentIndex !== targetIndex) {
        poll.options[currentIndex].votes = poll.options[
          currentIndex
        ].votes.filter((v) => !v.equals(userObjId));
      }

      // Add vote to new option if not already there
      if (!poll.options[targetIndex].votes.some((v) => v.equals(userObjId))) {
        poll.options[targetIndex].votes.push(userObjId);
      }

      await poll.save({ session });
      await session.commitTransaction();

      // Refresh poll from DB to ensure up-to-date data
      const updatedPoll = await this.pollModel.findById(poll._id).lean();

      return this.formatPoll(updatedPoll, userId);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async removeVote(pollId: Types.ObjectId, userId: string) {
    if (!Types.ObjectId.isValid(pollId))
      throw new BadRequestException('Invalid pollId');
    if (!Types.ObjectId.isValid(userId))
      throw new BadRequestException('Invalid userId');

    const session = await this.pollModel.db.startSession();
    session.startTransaction();

    try {
      const poll = await this.pollModel.findById(pollId).session(session);
      if (!poll) throw new NotFoundException('Poll not found');
      if (poll.expiresAt && poll.expiresAt < new Date())
        throw new ForbiddenException('Poll has expired');

      const userObjId = new Types.ObjectId(userId);
      const votedIndex = poll.options.findIndex((opt) =>
        opt.votes.some((v) => v.equals(userObjId)),
      );
      if (votedIndex === -1)
        throw new BadRequestException('User has not voted on this poll');

      poll.options[votedIndex].votes = poll.options[votedIndex].votes.filter(
        (v) => !v.equals(userObjId),
      );

      poll.totalVotes = poll.options.reduce(
        (sum, opt) => sum + opt.votes.length,
        0,
      );

      await poll.save({ session });
      await session.commitTransaction();

      return this.formatPoll(poll, new Types.ObjectId(userId));
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  formatPoll = (
    poll: (Document & Poll) | Poll,
    userId: Types.ObjectId | null = null,
  ) => {
    if (!poll || !poll.options) return null;
    const userObjId = userId ? new Types.ObjectId(userId) : null;

    const totalVotes = poll.options.reduce((sum, opt: any) => {
      const votesCount = Array.isArray(opt.votes) ? opt.votes.length : 0;
      return sum + votesCount;
    }, 0);

    const userVotedOption = poll.options.find((opt: any) =>
      Array.isArray(opt.votes)
        ? opt.votes.some((v: any) => v?.toString() === userObjId?.toString())
        : false,
    );

    return {
      id: (poll as any)._id ?? (poll as any).id,
      question: poll.question,
      expiresAt: poll.expiresAt,
      totalVotes,
      options: poll.options.map((opt) => ({
        optionId: opt.optionId,
        text: opt.optionText,
        votesCount: opt.votes.length,
        percentage:
          totalVotes > 0
            ? +((opt.votes.length / totalVotes) * 100).toFixed(1)
            : 0,
      })),
      hasVoted: !!userVotedOption,
      votedOptionId: userVotedOption ? userVotedOption.optionId : null,
    };
  };
}
