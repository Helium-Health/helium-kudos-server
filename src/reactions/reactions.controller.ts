import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  // Patch
} from '@nestjs/common';
import { ReactionService } from './reactions.service';
import { UpdateReactionDto } from './dto/reaction.dto';
import { Recognition } from 'src/recognition/schema/Recognition.schema';
import { Types } from 'mongoose';

@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionService) {}

  @Post(':recognitionId/reactions')
  async addReaction(
    @Param('recognitionId') recognitionId: Types.ObjectId,
    @Body() updateReactionDto: UpdateReactionDto,
  ): Promise<Recognition> {
    return this.reactionsService.addReaction(
      updateReactionDto.recognitionId,
      updateReactionDto.userId,
      updateReactionDto.reactionType,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: Types.ObjectId) {
    return this.reactionsService.remove(id);
  }
}
