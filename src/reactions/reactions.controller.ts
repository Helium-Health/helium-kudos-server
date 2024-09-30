import {
  Controller,
  Post,
  Body,
  Param,
  // Patch
} from '@nestjs/common';
import { ReactionService } from './reactions.service';
import {
  AddReactionDto,
  // UpdateReactionDto
} from './dto/create-reaction.dto';
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

  // @Patch(':recognitionId/reactions')
  // async updateReaction(
  //   @Param('recognitionId') recognitionId: string, // Extracts recognitionId from URL
  //   @Body() updateReactionDto: UpdateReactionDto, // Extracts new reaction type from request body
  // ): Promise<Recognition> {
  //   return this.reactionsService.updateReaction(
  //     updateReactionDto.recognitionId,
  //     updateReactionDto.userId,
  //     updateReactionDto.reactionType,
  //   );
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.reactionsService.remove(+id);
  // }
}
