import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  // Patch
} from '@nestjs/common';
import { ReactionService } from './reactions.service';
import {
  AddReactionDto,
  // UpdateReactionDto
} from './dto/reaction.dto';
import { Recognition } from 'src/schemas/recognitions.schema';
import { Types } from 'mongoose';

@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionService) {}

  @Post(':recognitionId/reactions')
  async addReaction(
    @Param('recognitionId') recognitionId: Types.ObjectId,
    @Body() addReactionDto: AddReactionDto,
  ): Promise<Recognition> {
    return this.reactionsService.addReaction(
      addReactionDto.recognitionId,
      addReactionDto.userId,
      addReactionDto.reactionType,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: Types.ObjectId) {
    return this.reactionsService.remove(id);
  }
}
