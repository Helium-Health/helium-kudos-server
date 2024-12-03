import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('top-givers')
  async getTopGivers() {
    return this.leaderboardService.getTopGivers();
  }

  @Get('top-receivers')
  async getTopReceivers() {
    return this.leaderboardService.getTopReceivers();
  }

  @Get('uncredited-users')
  async getUncreditedUsers() {
    return this.leaderboardService.getUncreditedUsers();
  }

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
}
