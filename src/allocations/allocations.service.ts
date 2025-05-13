import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Cadence } from 'src/constants';
import { MilestoneService } from 'src/milestone/milestone.service';
import { AllocationCronService } from './allocation.cron.service';

@Injectable()
export class AllocationsService {
  constructor(
    private readonly milestoneService: MilestoneService,
    private readonly allocationCronService: AllocationCronService,
  ) {}

  private readonly logger = new Logger(AllocationsService.name);

  async allocateCoinsToAllUsersManually(milestoneId: string): Promise<{
    message: string;
    milestoneId: string;
    cadence: Cadence;
    amount: number;
    status: 'success' | 'skipped' | 'failed';
  }> {
    const milestone =
      await this.milestoneService.findMilestoneById(milestoneId);

    if (!milestone) {
      throw new NotFoundException(
        `Milestone config not found for ID: ${milestoneId}`,
      );
    }

    this.logger.log(
      `🔁 Manually triggering ${milestone.cadence} allocation for Milestone ID: ${milestoneId}`,
    );

    const status = await this.allocationCronService.runAllocationByCadence(
      milestone,
      milestone.cadence,
    );

    return {
      message: `Manual allocation attempt completed`,
      milestoneId: milestoneId,
      cadence: milestone.cadence,
      amount: milestone.coins,
      status,
    };
  }
}
