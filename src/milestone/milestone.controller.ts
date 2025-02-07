import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { MilestoneType } from './schema/Milestone.schema';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('milestone')
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Post()
  create(@Body() createMilestoneDto: CreateMilestoneDto) {
    return this.milestoneService.create(createMilestoneDto);
  }

  @Get()
  findAll() {
    return this.milestoneService.findAll();
  }

  @Get('upcoming-celebrations')
  async getUpcomingCelebrations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('month') month?: string,
    @Query('celebrationType') celebrationType?: string,
  ) {
    const parsedMonth = month && !isNaN(+month) ? +month : undefined;
    if (month && isNaN(parsedMonth)) {
      throw new BadRequestException('Month must be a valid number');
    }

    return await this.milestoneService.getUpcomingCelebrations(
      limit,
      page,
      parsedMonth,
      celebrationType
        ? MilestoneType[celebrationType.toUpperCase()]
        : undefined,
    );
  }

  @Patch(':id')
  update(
    @Param('id') milestoneId: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.milestoneService.update(milestoneId, updateMilestoneDto);
  }
}
