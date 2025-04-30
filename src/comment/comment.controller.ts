import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { CreateCommentDto, UpdateCommentDto } from './dto/CreateComment.dto';
import { Types } from 'mongoose';

@Controller('comments')
export class CommentController {
  constructor(private commentService: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async addComment(@Request() req, @Body() createCommentDto: CreateCommentDto) {
    const userId = req.user.userId;
    return this.commentService.addComment(userId, createCommentDto);
  }

  @Get('recognition/:recognitionId')
  async getCommentsByRecognition(
    @Param('recognitionId') recognitionId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.commentService.getCommentsByRecognition(
      recognitionId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req,
  ) {
    return this.commentService.updateComment(
      commentId,
      updateCommentDto,
      req.user.userId,
    );
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
