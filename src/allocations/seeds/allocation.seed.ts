import { Injectable, Logger } from '@nestjs/common';
import { AllocationsService } from '../allocations.service';
import { CreateAllocationDto } from '../dto/create-allocation.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AllocationSeeder {
  private readonly logger = new Logger(AllocationSeeder.name);

  constructor(
    private readonly allocationService: AllocationsService,
    private readonly configService: ConfigService,
  ) {}

  async seedAllocations(): Promise<void> {
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );
    const cadence = environment === 'production' ? '0 0 1 * *' : '0 0 * * *'; // Monthly for prod, daily for non-prod
    const allocationAmount = environment === 'production' ? 5 : 300;
    const allocations: CreateAllocationDto[] = [
      { allocationAmount: allocationAmount, cadence },
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
