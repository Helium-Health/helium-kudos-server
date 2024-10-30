import { Injectable, Logger } from '@nestjs/common';
import { AllocationsService } from '../allocations.service';
import { CreateAllocationDto } from '../dto/create-allocation.dto';

@Injectable()
export class AllocationSeeder {
  private readonly logger = new Logger(AllocationSeeder.name);

  constructor(private readonly allocationService: AllocationsService) {}

  async seedAllocations(): Promise<void> {
    const allocations: CreateAllocationDto[] = [
      { allocationAmount: 300, cadence: '0 0 * * *' }, // Midnight daily
    ];

    for (const allocationDto of allocations) {
      try {
        // Directly create the allocation using the new create function in AllocationsService
        await this.allocationService.create(allocationDto);
        this.logger.log(
          `Allocation with cadence ${allocationDto.cadence} has been created.`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to seed allocation with cadence ${allocationDto.cadence}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log('Allocation seeding process completed.');
  }
}
