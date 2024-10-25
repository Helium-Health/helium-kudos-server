import { Injectable, Logger } from '@nestjs/common';
import { AllocationsService } from '../allocations.service';
import { CreateAllocationDto } from '../dto/create-allocation.dto';

@Injectable()
export class AllocationSeeder {
  private readonly logger = new Logger(AllocationSeeder.name);

  constructor(private readonly allocationService: AllocationsService) {}

  async seedAllocations(): Promise<void> {
    const allocations: CreateAllocationDto[] = [
      { allocationAmount: 500, cadence: '58 14 * * *' }, // Example allocation
    ];

    for (const allocationDto of allocations) {
      try {
        const allocationExists = await this.allocationService.findAllocation();

        if (allocationExists) {
          this.logger.log(
            `Allocation with cadence ${allocationDto.cadence} already exists. Skipping.`,
          );
          continue;
        }

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
