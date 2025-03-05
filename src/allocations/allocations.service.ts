import {
  ForbiddenException,
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
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AllocationsService implements OnModuleInit {
  private readonly CUTOFF_DATE = new Date('2025-02-15');

  constructor(
    @InjectModel(Allocation.name)
    private readonly allocationModel: Model<Allocation>,
    private readonly walletService: WalletService,
  ) {}

  private readonly logger = new Logger(AllocationsService.name);
  private allocations: Map<string, string> = new Map();

  async onModuleInit() {
    await this.loadAllocations();
  }

  // TODO: Remove this method after February 15th, 2025
  async allocateCoinsToAllUsers(amount: number): Promise<void> {
    const currentDate = new Date();

    if (currentDate > this.CUTOFF_DATE) {
      throw new ForbiddenException(
        'Bulk allocation is no longer available after February 15th, 2025',
      );
    }

    const session = await this.allocationModel.db.startSession();
    session.startTransaction();

    try {
      await this.walletService.allocateCoinsToAll(amount);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async loadAllocations() {
    const allocations = await this.allocationModel.find().exec();
    allocations.forEach((allocation) => {
      this.allocations.set(allocation._id.toString(), allocation.cadence);
    });
    this.logger.log(`Loaded ${allocations.length} allocations into memory.`);
  }

  async create(createAllocationDto: CreateAllocationDto): Promise<Allocation> {
    const existingAllocations = await this.allocationModel.find().exec();

    if (existingAllocations.length > 0) {
      // Delete all existing allocations
      await this.allocationModel.deleteMany({});
      this.logger.warn('Existing allocations found and deleted.');

      // Clear the in-memory allocation map
      this.allocations.clear();
    }

    // Create the new allocation
    const createdAllocation = new this.allocationModel(createAllocationDto);
    await createdAllocation.save();

    // Update the in-memory allocations map
    this.allocations.set(
      createdAllocation._id.toString(),
      createAllocationDto.cadence,
    );

    this.logger.log(`New allocation created with ID: ${createdAllocation._id}`);
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

    if (updateAllocationDto.cadence) {
      this.allocations.set(id, updateAllocationDto.cadence);
    }

    return updatedAllocation;
  }

  async findAllocation(): Promise<AllocationDocument> {
    return this.allocationModel.findOne().exec();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
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
    const cronParts = cadence.split(' ');

    if (cronParts.length !== 5) {
      this.logger.warn(`Invalid cadence format: ${cadence}`);
      return false;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;

    if (minute !== '*' && !this.matchCronField(minute, now.getMinutes())) {
      this.logger.log(
        `Minute mismatch: expected ${minute}, got ${now.getMinutes()}`,
      );
      return false;
    }

    if (hour !== '*' && !this.matchCronField(hour, now.getHours())) {
      this.logger.log(`Hour mismatch: expected ${hour}, got ${now.getHours()}`);
      return false;
    }

    if (dayOfMonth !== '*' && !this.matchCronField(dayOfMonth, now.getDate())) {
      this.logger.log(
        `Day of month mismatch: expected ${dayOfMonth}, got ${now.getDate()}`,
      );
      return false;
    }

    if (month !== '*' && !this.matchCronField(month, now.getMonth() + 1)) {
      this.logger.log(
        `Month mismatch: expected ${month}, got ${now.getMonth() + 1}`,
      );
      return false;
    }

    if (dayOfWeek !== '*' && !this.matchCronField(dayOfWeek, now.getDay())) {
      this.logger.log(
        `Day of week mismatch: expected ${dayOfWeek}, got ${now.getDay()}`,
      );
      return false;
    }

    return true;
  }

  private matchCronField(field: string, value: number): boolean {
    if (field === '*') return true;

    const values = field.split(',').map((v) => v.trim());
    for (const val of values) {
      if (val.startsWith('/')) {
        const interval = parseInt(val.slice(1), 10);
        if (value % interval === 0) return true;
      } else if (val.includes('-')) {
        const [start, end] = val.split('-').map(Number);
        if (value >= start && value <= end) return true;
      } else {
        if (parseInt(val, 10) === value) return true;
      }
    }
    return false;
  }

  private async executeAllocation(id: string) {
    try {
      const allocation = await this.allocationModel.findById(id).exec();

      if (!allocation) {
        throw new NotFoundException(`Allocation with ID ${id} not found`);
      }

      await this.walletService.allocateCoinsToAll(allocation.allocationAmount);
      this.logger.log(`Coin allocation completed successfully for ID: ${id}`);
    } catch (error) {
      this.logger.error(
        `Coin allocation failed for ID ${id}: ${error.message}`,
      );
      throw new Error(error.message);
    }
  }

  async findAllocationByCadence(
    cadence: string,
  ): Promise<AllocationDocument | null> {
    return this.allocationModel.findOne({ cadence }).exec();
  }
}
