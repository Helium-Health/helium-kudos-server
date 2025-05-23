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
  private readonly MILLISECONDS_IN_SECOND = 1000;
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

  @UseGuards(JwtAuthGuard)
  @Get('company-values')
  async getCompanyValueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parseStartDate = startDate
      ? new Date(Number(startDate) * this.MILLISECONDS_IN_SECOND)
      : undefined;
    const parseEndDate = endDate
      ? new Date(Number(endDate) * this.MILLISECONDS_IN_SECOND)
      : new Date();
    return this.leaderboardService.getCompanyValueAnalytics(
      parseStartDate,
      parseEndDate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('most-recognized')
  async getTopRecognitionReceivers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: number,
    @Query('endDate') endDate?: number,
  ) {
    const parsedStartDate = startDate
      ? new Date(Number(startDate) * this.MILLISECONDS_IN_SECOND)
      : undefined;
    const parsedEndDate = endDate
      ? new Date(Number(endDate) * this.MILLISECONDS_IN_SECOND)
      : new Date();
    return this.leaderboardService.getTopRecognitionReceivers(
      page,
      limit,
      parsedStartDate,
      parsedEndDate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('most-active')
  async getTopRecognitionSenders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: number,
    @Query('endDate') endDate?: number,
  ) {
    const parsedStartDate = startDate
      ? new Date(Number(startDate) * this.MILLISECONDS_IN_SECOND)
      : undefined;
    const parsedEndDate = endDate
      ? new Date(Number(endDate) * this.MILLISECONDS_IN_SECOND)
      : new Date();
    return this.leaderboardService.getTopRecognitionSenders(
      page,
      limit,
      parsedStartDate,
      parsedEndDate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('coin-use')
  async getCoinUseMetrics(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('totalCoinEarned'))
    sortBy: 'totalCoinEarned' | 'totalCoinBalance' | 'totalCoinSpent',
    @Query('sortOrder', new DefaultValuePipe('DESCENDING'))
    sortOrder: 'ASCENDING' | 'DESCENDING',
    @Query('startDate') startDate?: number,
    @Query('endDate') endDate?: number,
  ) {
    const parsedStartDate = startDate
      ? new Date(Number(startDate) * this.MILLISECONDS_IN_SECOND)
      : undefined;
    const parsedEndDate = endDate
      ? new Date(Number(endDate) * this.MILLISECONDS_IN_SECOND)
      : new Date();
    return this.leaderboardService.getCoinUseMetrics(
      page,
      limit,
      sortBy,
      sortOrder,
      parsedStartDate,
      parsedEndDate,
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
  @Get('total-coin-and-recognition')
  async totalCoinAndRecognitionGiven(
    @Query('startDate') startDate?: number,
    @Query('endDate') endDate?: number,
  ) {
    const parsedStartDate = startDate
      ? new Date(Number(startDate) * this.MILLISECONDS_IN_SECOND)
      : undefined;
    const parsedEndDate = endDate
      ? new Date(Number(endDate) * this.MILLISECONDS_IN_SECOND)
      : new Date();

    return await this.leaderboardService.totalCoinAndRecognitionGiven(
      parsedStartDate,
      parsedEndDate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('post-metrics')
  async postMetrics(
    @Query('startDate') startDate?: number,
    @Query('endDate') endDate?: number,
  ) {
    const parsedStartDate = startDate
      ? new Date(Number(startDate) * this.MILLISECONDS_IN_SECOND)
      : undefined;
    const parsedEndDate = endDate
      ? new Date(Number(endDate) * this.MILLISECONDS_IN_SECOND)
      : new Date();
    return await this.leaderboardService.cumulativePostMetrics(
      parsedStartDate,
      parsedEndDate,
    );
  }
}
