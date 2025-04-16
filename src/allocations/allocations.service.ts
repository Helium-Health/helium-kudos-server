import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import {
  Allocation,
  AllocationCadence,
  AllocationDocument,
} from './schema/Allocation.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class AllocationsService implements OnModuleInit {
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

  async loadAllocations(): Promise<Map<string, string>> {
    const allocations = await this.allocationModel.find().exec();
    this.allocations.clear();
    allocations.forEach((allocation) => {
      this.allocations.set(allocation._id.toString(), allocation.cadence);
    });
    this.logger.log(`Loaded ${allocations.length} allocations into memory.`);
    return this.allocations;
  }

  async create(createAllocationDto: CreateAllocationDto): Promise<Allocation> {
    const existingAllocations = await this.allocationModel.find().exec();

    if (existingAllocations.length > 0) {
      await this.allocationModel.deleteMany({});
      this.logger.warn('Existing allocations found and deleted.');
      this.allocations.clear();
    }

    // Convert cadence key to its corresponding cron expression
    const cronValue = AllocationCadence[createAllocationDto.cadence];

    const createdAllocation = new this.allocationModel({
      ...createAllocationDto,
      cadence: cronValue,
    });

    await createdAllocation.save();

    this.allocations.set(createdAllocation._id.toString(), cronValue);

    this.logger.log(`New allocation created with ID: ${createdAllocation._id}`);
    return createdAllocation;
  }

  async update(
    id: string,
    updateAllocationDto: UpdateAllocationDto,
  ): Promise<Allocation> {
    const updateData: Partial<Record<string, any>> = { ...updateAllocationDto };

    // Convert cadence key to enum value (cron string) if it exists
    if (updateAllocationDto.cadence) {
      updateData.cadence = AllocationCadence[updateAllocationDto.cadence];
    }

    const updatedAllocation = await this.allocationModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updatedAllocation) {
      throw new NotFoundException(`Allocation with ID ${id} not found`);
    }

    // Update the in-memory Map if cadence was updated
    if (updateData.cadence) {
      this.allocations.set(id, updateData.cadence);
    }

    return updatedAllocation;
  }

  async findAllAllocations(): Promise<AllocationDocument[]> {
    return this.allocationModel.find().exec();
  }
}
