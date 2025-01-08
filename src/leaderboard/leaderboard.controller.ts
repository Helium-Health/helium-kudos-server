import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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

  @UseGuards(AdminGuard)
  @Get('earned-coins')
  async getUsersWithEarnedCoins(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.leaderboardService.getPaginatedUsersWithEarnedCoins(
      page,
      limit,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('recognition-receivers')
  async getTopRecognitionReceivers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.leaderboardService.getTopRecognitionReceivers(page, limit);
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
}
