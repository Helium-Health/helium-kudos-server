import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

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
  async getUpcomingCelebrations() {
    return await this.milestoneService.getUpcomingCelebrations();
  }

  @Patch(':id')
  update(
    @Param('id') milestoneId: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.milestoneService.update(milestoneId, updateMilestoneDto);
  }
}
