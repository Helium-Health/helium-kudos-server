import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  // UseGuards,
  // Patch
} from '@nestjs/common';
import { ReactionService } from './reactions.service';
import { UpdateReactionDto } from './dto/reaction.dto';
import { Recognition } from 'src/recognition/schema/Recognition.schema';
import { Types } from 'mongoose';
// import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';

@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionService) {}

  // @UseGuards(JwtAuthGuard)
  @Post('reactions')
  async addReaction(
    @Body() updateReactionDto: UpdateReactionDto,
  ): Promise<Recognition> {
    return this.reactionsService.addReaction(
      updateReactionDto.recognitionId,
      updateReactionDto.userId,
      updateReactionDto.reactionType,
    );
  }
  // @UseGuards(JwtAuthGuard)
  @Get(':recognitionId')
  async getReactionsByRecognitionId(
    @Param('recognitionId') recognitionId: Types.ObjectId,
  ): Promise<any> {
    return this.reactionsService.getReactionsByRecognitionId(recognitionId);
  }
  // @UseGuards(JwtAuthGuard)
  @Delete(':reactionId')
  remove(@Param('reactionId') reactionId: Types.ObjectId) {
    return this.reactionsService.deleteReaction(reactionId);
  }
}
