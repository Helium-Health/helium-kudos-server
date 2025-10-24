import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { PollService } from './poll.service';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { CreatePollDto, VotePollDto } from './dto/poll.dto';

@Controller('poll')
@UseGuards(JwtAuthGuard)
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post(':pollId/vote')
  async toggleVote(
    @Param('pollId') pollId: string,
    @Body() dto: VotePollDto,
    @Request() req,
  ) {
    return this.pollService.vote(
      new Types.ObjectId(pollId),
      req.user.userId,
      dto.optionId,
    );
  }

  @Patch(':pollId/remove-vote')
  async removeVote(@Param('pollId') pollId: string, @Request() req) {
    return this.pollService.removeVote(
      new Types.ObjectId(pollId),
      req.user.userId,
    );
  }
}
