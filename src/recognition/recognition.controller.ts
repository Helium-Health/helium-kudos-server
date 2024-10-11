import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RecognitionService } from './recognition.service';
import { CreateRecognitionDto } from './dto/CreateRecognition.dto';
import { Recognition } from './schema/Recognition.schema';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';

@Controller('recognition')
@UseGuards(JwtAuthGuard)
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
  ) {
    return this.recognitionService.getAllRecognitions(page, limit);
  }

  @Get('recent')
  async getRecognitionsSortedByRecent(): Promise<Recognition[]> {
    return this.recognitionService.getRecognitionsSortedByRecent();
  }
}
