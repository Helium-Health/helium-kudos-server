import { Injectable, Logger } from '@nestjs/common';
import { AllocationsService } from '../allocations.service';
import { CreateAllocationDto } from '../dto/create-allocation.dto';
import { ConfigService } from '@nestjs/config';
import { AllocationCadence } from '../schema/Allocation.schema';

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

    const isProduction = environment === 'production';

    const cronValue = isProduction
      ? AllocationCadence.MONTHLY
      : AllocationCadence.DAILY;

    const cadence = Object.keys(AllocationCadence).find(
      (key) =>
        AllocationCadence[key as keyof typeof AllocationCadence] === cronValue,
    ) as keyof typeof AllocationCadence;

    if (!cadence) {
      this.logger.error(
        `Invalid cadence value resolved for environment: ${environment}`,
      );
      return;
    }

    const allocationName = isProduction
      ? 'Monthly Allocation'
      : 'Daily Allocation';
    const allocationAmount = isProduction ? 5 : 300;

    const allocations: CreateAllocationDto[] = [
      { allocationName, allocationAmount, cadence },
    ];

    for (const allocationDto of allocations) {
      try {
        await this.allocationService.create(allocationDto);
        this.logger.log(
          `✅ Allocation "${allocationDto.allocationName}" with cadence "${allocationDto.cadence}" created.`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Failed to seed allocation "${allocationDto.allocationName}" with cadence "${allocationDto.cadence}": ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log('🌱 Allocation seeding process completed.');
  }
}
