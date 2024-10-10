import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReactionService } from './reactions.service';
import { CreateReactionDto } from './dto/reaction.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { Reaction } from './schema/reactions.schema';
@UseGuards(JwtAuthGuard)
@Controller('reactions/')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionService) {}

  @Post()
  async addReaction(
    @Request() req,
    @Body() createReactionDto: CreateReactionDto,
  ): Promise<Reaction> {
    const userId = req.user.userId;
    return this.reactionsService.addReaction(
      createReactionDto.recognitionId,
      userId,
      createReactionDto.shortcodes,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':reactionId')
  remove(@Param('reactionId') reactionId: Types.ObjectId) {
    return this.reactionsService.deleteReaction(reactionId);
  }
}
