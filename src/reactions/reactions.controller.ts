import {
  Controller,
  Post,
  Body,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReactionService } from './reactions.service';
import { ReactionDto } from './dto/reaction.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { Reaction } from './schema/reactions.schema';
@UseGuards(JwtAuthGuard)
@Controller('reactions/')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionService) {}

  @Post()
  async addReaction(
    @Request() req,
    @Body() createReactionDto: ReactionDto,
  ): Promise<Reaction> {
    const userId = req.user.userId;
    return this.reactionsService.addReaction(
      createReactionDto.recognitionId,
      userId,
      createReactionDto.shortcodes,
    );
  }

  @Delete()
  remove(@Request() req, @Body() deleteReactionDto: ReactionDto) {
    const userId = req.user.userId;
    return this.reactionsService.deleteReaction(
      deleteReactionDto.recognitionId,
      userId,
      deleteReactionDto.shortcodes,
    );
  }
}
