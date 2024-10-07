import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import { CronJob } from 'cron';
import { Allocation, AllocationDocument } from './schema/Allocation.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { WalletService } from 'src/wallet/wallet.service';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class AllocationsService {
  constructor(
    @InjectModel(Allocation.name)
    private readonly allocationModel: Model<Allocation>,
    private readonly walletService: WalletService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  private readonly logger = new Logger(AllocationsService.name);

  // Method to create allocation and dynamically set a cron job
  async create(createAllocationDto: CreateAllocationDto): Promise<Allocation> {
    const createdAllocation = new this.allocationModel(createAllocationDto);
    await createdAllocation.save();

    // Register cron job after creating allocation
    this.addCronJob(
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

    // Update cron job if cadence has changed
    if (updateAllocationDto.cadence) {
      this.updateCronJob(id, updateAllocationDto.cadence);
    }

    return updatedAllocation;
  }
  async findAllocation(): Promise<AllocationDocument> {
    return this.allocationModel.findOne().exec();
  }

  // Method to dynamically add a cron job based on cadence
  private addCronJob(id: string, cadence: string) {
    const job = new CronJob(cadence, async () => {
      this.logger.log(`Executing coin allocation for allocation ID: ${id}`);
      try {
        const allocation = await this.allocationModel.findById(id).exec();
        if (!allocation) {
          throw new NotFoundException(`Allocation with ID ${id} not found`);
        }
        await this.walletService.allocateCoinsToAll(
          allocation.allocationAmount,
        );
        this.logger.log('Monthly coin allocation completed successfully.');
      } catch (error) {
        this.logger.error(
          `Coin allocation failed for ID ${id}: ${error.message}`,
          error.stack,
        );
      }
    });

    // Add the cron job to the registry
    this.schedulerRegistry.addCronJob(`allocation_${id}`, job);
    job.start();
    this.logger.log(
      `Cron job added for allocation ID ${id} with cadence: ${cadence}`,
    );
  }

  // Method to update an existing cron job
  private updateCronJob(id: string, newCadence: string) {
    // Remove the old cron job if it exists
    const existingJob = this.schedulerRegistry.getCronJob(`allocation_${id}`);
    if (existingJob) {
      this.schedulerRegistry.deleteCronJob(`allocation_${id}`);
      this.logger.log(`Old cron job for allocation ID ${id} removed.`);
    }

    // Add the updated cron job with new cadence
    this.addCronJob(id, newCadence);
  }
}
