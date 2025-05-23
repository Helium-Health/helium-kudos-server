import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RecognitionService } from './recognition.service';
import {
  CreateRecognitionDto,
  EditRecognitionDto,
} from './dto/CreateRecognition.dto';
import { Recognition } from './schema/Recognition.schema';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { Types } from 'mongoose';
import { MilestoneType } from 'src/milestone/schema/Milestone.schema';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard } from 'src/auth/guards/active-user.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@ApiTags('Recognition')
@ApiBearerAuth()
@Controller('recognition')
@UseGuards(JwtAuthGuard, ActiveUserGuard)
export class RecognitionController {
  constructor(private readonly recognitionService: RecognitionService) {}

  @Post()
  async create(
    @Request() req,
    @Body() createRecognitionDto: CreateRecognitionDto,
  ): Promise<Recognition> {
    const senderId = req.user.userId;
    return this.recognitionService.createRecognition(
      senderId,
      createRecognitionDto,
    );
  }

  @Get()
  async getAllRecognitions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('role') role?: string,
    @Query('milestoneType') milestoneType?: MilestoneType,
    @Query('isAuto', new DefaultValuePipe(undefined)) isAuto?: string,
  ) {
    const parsedIsAuto = isAuto === undefined ? undefined : isAuto === 'true';
    return this.recognitionService.getAllRecognitions(
      page,
      limit,
      userId,
      role,
      milestoneType,
      parsedIsAuto,
    );
  }

  @Patch(':id')
  async editRecognition(
    @Param('id') recognitionId: string,
    @Body() editRecognitionDto: EditRecognitionDto,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.recognitionService.editRecognition(
      new Types.ObjectId(recognitionId),
      new Types.ObjectId(userId),
      editRecognitionDto,
    );
  }

  @Delete(':id')
  async deleteRecogntions(@Request() req, @Param('id') recognitionId: string) {
    const userId = req.user.userId;
    return this.recognitionService.deleteRecognition(
      new Types.ObjectId(recognitionId),
      new Types.ObjectId(userId),
    );
  }

  @Delete('auto/:id')
  @UseGuards(AdminGuard)
  async deleteAutoRecognition(@Param('id') recognitionId: string) {
    return this.recognitionService.deleteAutoRecognition(
      new Types.ObjectId(recognitionId),
    );
  }
}
