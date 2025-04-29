import { Controller, Post, Query } from '@nestjs/common';
import { AllocationsService } from './allocations.service';

@Controller('allocations')
export class AllocationsController {
  constructor(private readonly allocationService: AllocationsService) {}

  @Post('manual-allocation')
  async allocateToAllUsers(@Query('milestoneId') milestoneId: string) {
    return this.allocationService.allocateCoinsToAllUsersManually(milestoneId);
  }
}
