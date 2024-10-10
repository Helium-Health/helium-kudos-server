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
import { Recognition } from 'src/recognition/schema/Recognition.schema';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';

@Controller('reactions/')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async addReaction(
    @Request() req,
    @Body() createReactionDto: CreateReactionDto,
  ): Promise<Recognition> {
    const userId = req.user.userId;
    return this.reactionsService.addReaction(
      createReactionDto.recognitionId,
      userId,
      createReactionDto.reactionType,
      createReactionDto.shortcodes,
    );
  }

  @Get(':recognitionId')
  async getReactionsByRecognitionId(
    @Param('recognitionId') recognitionId: Types.ObjectId,
  ): Promise<any> {
    return this.reactionsService.getReactionsByRecognitionId(recognitionId);
  }
  @UseGuards(JwtAuthGuard)
  @Delete(':reactionId')
  remove(@Param('reactionId') reactionId: Types.ObjectId) {
    return this.reactionsService.deleteReaction(reactionId);
  }
}
