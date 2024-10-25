import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import { Allocation, AllocationDocument } from './schema/Allocation.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { WalletService } from 'src/wallet/wallet.service';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class AllocationsService implements OnModuleInit {
  constructor(
    @InjectModel(Allocation.name)
    private readonly allocationModel: Model<Allocation>,
    private readonly walletService: WalletService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  private readonly logger = new Logger(AllocationsService.name);

  // Store active allocations to manage execution
  private allocations: Map<string, string> = new Map();

  async onModuleInit() {
    await this.loadAllocations(); // Load allocations when the module initializes
  }

  private async loadAllocations() {
    const allocations = await this.allocationModel.find().exec();
    allocations.forEach((allocation) => {
      this.allocations.set(allocation._id.toString(), allocation.cadence);
    });
    this.logger.log(`Loaded ${allocations.length} allocations into memory.`);
  }

  // Method to create allocation and register it
  async create(createAllocationDto: CreateAllocationDto): Promise<Allocation> {
    const createdAllocation = new this.allocationModel(createAllocationDto);
    await createdAllocation.save();

    // Register the allocation to manage execution
    this.allocations.set(
      createdAllocation._id.toString(),
      createAllocationDto.cadence,
    );

    return createdAllocation;
  }

  async update(
    id: string,
    updateAllocationDto: UpdateAllocationDto,
  ): Promise<Allocation> {
    const updatedAllocation = await this.allocationModel
      .findByIdAndUpdate(id, { $set: updateAllocationDto }, { new: true })
      .exec();

    if (!updatedAllocation) {
      throw new NotFoundException(`Allocation with ID ${id} not found`);
    }

    // Update the stored cadence
    if (updateAllocationDto.cadence) {
      this.allocations.set(id, updateAllocationDto.cadence);
    }

    return updatedAllocation;
  }

  async findAllocation(): Promise<AllocationDocument> {
    return this.allocationModel.findOne().exec();
  }

  @Cron('* * * * *') // Runs every minute
  handleCron() {
    const now = new Date();
    this.logger.log(`Cron job running at ${now.toISOString()}`);

    for (const [id, cadence] of this.allocations.entries()) {
      if (this.shouldExecute(cadence, now)) {
        this.logger.log(`Executing allocation for ID: ${id}`);
        this.executeAllocation(id).catch((error) => {
          this.logger.error(
            `Coin allocation failed for ID ${id}: ${error.message}`,
            error.stack,
          );
        });
      } else {
        this.logger.log(
          `Skipping allocation for ID: ${id} at ${now.toISOString()}`,
        );
      }
    }
  }

  private shouldExecute(cadence: string, now: Date): boolean {
    if (
      cadence === '0 0 1 1,4,7,10 *' &&
      now.getDate() === 1 &&
      now.getHours() === 0 &&
      now.getMinutes() === 0
    ) {
      return true;
    }
    //Every day by 2:40PM
    if (
      cadence === '40 14 * * *' &&
      now.getHours() === 14 &&
      now.getMinutes() === 40
    ) {
      return true;
    }
    return false;
  }

  private async executeAllocation(id: string) {
    const allocation = await this.findAllocation();

    if (!allocation) {
      throw new NotFoundException(`Allocation not found`);
    }

    await this.walletService.allocateCoinsToAll(allocation.allocationAmount);
    this.logger.log('Coin allocation completed successfully for ID: ' + id);
  }
}
