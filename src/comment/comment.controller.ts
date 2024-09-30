import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { CreateCommentDto } from './dto/CreateComment.dto';
import { Types } from 'mongoose';

@Controller('comments')
export class CommentController {
  constructor(private commentService: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async addComment(@Request() req, @Body() createCommentDto: CreateCommentDto) {
    return this.commentService.addComment(req.user.userId, createCommentDto);
  }

  @Get('recognition/:recognitionId')
  async getCommentsByRecognition(
    @Param('recognitionId') recognitionId: string,
  ) {
    return this.commentService.getCommentsByRecognition(recognitionId);
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('commentId') commentId: string, @Request() req) {
    return this.commentService.deleteComment(
      new Types.ObjectId(commentId),
      req.user.userId,
    );
  }
}
