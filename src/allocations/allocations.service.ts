import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import { Allocation, AllocationDocument } from './schema/Allocation.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { WalletService } from 'src/wallet/wallet.service';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class AllocationsService {
  constructor(
    @InjectModel(Allocation.name)
    private readonly allocationModel: Model<Allocation>,
    private readonly walletService: WalletService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  private readonly logger = new Logger(AllocationsService.name);

  // Store active allocations to manage execution
  private allocations: Map<string, string> = new Map();

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

  // Method to execute allocations based on cadence
  @Cron('0 0 * * *') // This runs daily at midnight
  handleCron() {
    const now = new Date();
    for (const [id, cadence] of this.allocations.entries()) {
      if (this.shouldExecute(cadence, now)) {
        this.executeAllocation(id).catch((error) => {
          this.logger.error(
            `Coin allocation failed for ID ${id}: ${error.message}`,
            error.stack,
          );
        });
      }
    }
  }

  // Determine if the allocation should be executed based on its cadence
  private shouldExecute(cadence: string, now: Date): boolean {
    // Quarterly execution logic
    if (
      cadence === '0 0 1 1,4,7,10 *' &&
      now.getDate() === 1 &&
      now.getHours() === 0 &&
      now.getMinutes() === 0
    ) {
      // This checks if it is the 1st day of January, April, July, or October at midnight
      return true;
    }
    // Check for daily execution: '0 0 * * *'
    if (
      cadence === '0 0 * * *' &&
      now.getHours() === 0 &&
      now.getMinutes() === 0
    ) {
      // It's midnight, should execute daily
      return true;
    }
    return false;
  }

  private async executeAllocation(id: string) {
    const allocation = await this.findAllocation();

    if (!allocation) {
      throw new NotFoundException(`Allocation  not found`);
    }

    await this.walletService.allocateCoinsToAll(allocation.allocationAmount);
    this.logger.log('Coin allocation completed successfully for ID: ' + id);
  }
}
