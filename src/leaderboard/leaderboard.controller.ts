import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('top-users')
  async getTopUsers(
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('filterBy') filterBy: 'sender' | 'receiver' = 'sender',
  ) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const effectiveYear = year || currentYear;
    const effectiveMonth = month || currentMonth;

    return this.leaderboardService.topUsers(
      effectiveYear,
      filterBy,
      effectiveMonth,
    );
  }

  @UseGuards(AdminGuard)
  @Get('uncredited-users')
  async getUncreditedUsers() {
    return this.leaderboardService.getUncreditedUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('most-recognized')
  async getTopRecognitionReceivers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.leaderboardService.getTopRecognitionReceivers(page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('most-active')
  async getTopRecognitionSenders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.leaderboardService.getTopRecognitionSenders(page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('participants/:year/:quarter')
  async getQuarterParticipants(
    @Param('year') year: number,
    @Param('quarter') quarter: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.leaderboardService.getQuarterParticipants(
      page,
      limit,
      year,
      quarter,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('statistics')
  async yearlyStatistics(@Query('year') year?: number) {
    const targetYear = year || new Date().getFullYear();
    return this.leaderboardService.getYearlyStatisticsWithMonthlyDetails(
      targetYear,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('total-coin-and-recognition-given')
  async totalCoinAndRecognitionGiven(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : new Date();

    return await this.leaderboardService.totalCoinAndRecognitionGiven(
      parsedStartDate,
      parsedEndDate,
    );
  }
}
