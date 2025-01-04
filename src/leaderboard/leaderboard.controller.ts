import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @UseGuards(AdminGuard)
  @Get('top-givers')
  async getTopGivers() {
    return this.leaderboardService.getTopGivers();
  }

  @UseGuards(AdminGuard)
  @Get('top-receivers')
  async getTopReceivers() {
    return this.leaderboardService.getTopReceivers();
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

  @UseGuards(AdminGuard, JwtAuthGuard)
  @Get('recognition-receivers')
  async getTopRecognitionReceivers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.leaderboardService.getTopRecognitionReceivers(page, limit);
  }

  @UseGuards(AdminGuard, JwtAuthGuard)
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

  @UseGuards(AdminGuard, JwtAuthGuard)
  @Get('statistics')
  async yearlyStatistics(@Query('year') year?: number) {
    const targetYear = year || new Date().getFullYear();
    return this.leaderboardService.getYearlyStatisticsWithMonthlyDetails(
      targetYear,
    );
  }
}
