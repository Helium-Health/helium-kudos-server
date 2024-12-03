import { Controller, Get } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

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
}
