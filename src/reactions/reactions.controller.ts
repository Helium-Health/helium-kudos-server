import { Controller, Post, Body, Param } from '@nestjs/common';
import { ReactionService } from './reactions.service';
import { AddReactionDto } from './dto/create-reaction.dto';
// import { UpdateReactionDto } from './dto/update-reaction.dto';
import { Recognition } from 'src/schemas/recognitions.schema';

@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionService) {}

  @Post(':recognitionId/reactions')
  async addReaction(
    @Param('recognitionId') recognitionId: string,
    @Body() addReactionDto: AddReactionDto,
  ): Promise<Recognition> {
    return this.reactionsService.addReaction(
      addReactionDto.recognitionId,
      addReactionDto.userId,
      addReactionDto.reactionType,
    );
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.reactionsService.remove(+id);
  // }
}
