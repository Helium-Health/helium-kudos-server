import { Injectable, Logger } from '@nestjs/common';
import { AllocationsService } from '../allocations.service';
import { CreateAllocationDto } from '../dto/create-allocation.dto';

@Injectable()
export class AllocationSeeder {
  private readonly logger = new Logger(AllocationSeeder.name);

  constructor(private readonly allocationService: AllocationsService) {}

  async seedAllocations(): Promise<void> {
    const allocations: CreateAllocationDto[] = [
      { allocationAmount: 500, cadence: '0 0 1 1,4,7,10 *' }, // Quarterly Allocation
      { allocationAmount: 300, cadence: '00 10 * * *' }, // 10AM Daily
    ];

    for (const allocationDto of allocations) {
      try {
        const allocationExists =
          await this.allocationService.findAllocationByCadence(
            allocationDto.cadence,
          );

        if (allocationExists) {
          this.logger.log(
            `Allocation with cadence ${allocationDto.cadence} already exists. Skipping.`,
          );
          continue;
        }

        // Create the allocation if it does not exist
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
