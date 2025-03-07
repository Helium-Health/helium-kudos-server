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
import { MilestoneCronService } from './milestone.cron.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Milestone')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('milestone')
export class MilestoneController {
  constructor(
    private readonly milestoneService: MilestoneService,
    private readonly milestoneCronService: MilestoneCronService,
  ) {}

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() createMilestoneDto: CreateMilestoneDto) {
    return this.milestoneService.create(createMilestoneDto);
  }

  @UseGuards(AdminGuard)
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

  @UseGuards(AdminGuard)
  @Patch(':id')
  update(
    @Param('id') milestoneId: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.milestoneService.update(milestoneId, updateMilestoneDto);
  }

  // Trigger milestone recognition manually
  // Hide endpoints in production
  // @Post('trigger-birthday')
  // async triggerBirthdayRecognitions() {
  //   await this.milestoneCronService.handleBirthdayRecognitions();
  //   return { message: 'Birthday recognitions triggered successfully' };
  // }

  // @Post('trigger-work-anniversary')
  // async triggerWorkAnniversaryRecognitions() {
  //   await this.milestoneCronService.handleWorkAnniversaryRecognitions();
  //   return { message: 'Work anniversary recognitions triggered successfully' };
  // }

  // @Post('trigger-mens-day')
  // async triggerMensDayRecognitions() {
  //   await this.milestoneCronService.handleMensDayRecognitions();
  //   return {
  //     message: "International Men's Day recognitions triggered successfully",
  //   };
  // }

  // @Post('trigger-womens-day')
  // async triggerWomensDayRecognitions() {
  //   await this.milestoneCronService.handleWomensDayRecognitions();
  //   return {
  //     message: "International Women's Day recognitions triggered successfully",
  //   };
  // }

  // @Post('trigger-employee-appreciation')
  // async triggerEmployeeAppreciationRecognitions() {
  //   await this.milestoneCronService.handleEmployeeAppreciationDayRecognitions();
  //   return {
  //     message: 'Employee Appreciation Day recognitions triggered successfully',
  //   };
  // }
}
