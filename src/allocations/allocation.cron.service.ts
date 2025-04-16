import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Allocation } from './schema/Allocation.schema';
import {
  AllocationRecord,
  AllocationCadence,
} from './schema/Allocation.schema';
import { WalletService } from 'src/wallet/wallet.service';
import { AllocationsService } from './allocations.service';

@Injectable()
export class AllocationCronService {
  private readonly logger = new Logger(AllocationCronService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly allocationService: AllocationsService,
    @InjectModel(Allocation.name)
    private readonly allocationModel: Model<Allocation>,
    @InjectModel(AllocationRecord.name)
    private readonly allocationRecordModel: Model<AllocationRecord>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleGenericAllocationCron(): Promise<void> {
    const cachedAllocations = await this.allocationService.loadAllocations();

    for (const [allocationId, cadence] of cachedAllocations.entries()) {
      if (this.shouldRunAllocation(cadence as AllocationCadence)) {
        await this.runAllocationByCadence(
          allocationId,
          cadence as AllocationCadence,
        );
      }
    }
  }

  private shouldRunAllocation(cadence: AllocationCadence): boolean {
    return [AllocationCadence.DAILY, AllocationCadence.MONTHLY].includes(
      cadence,
    );
  }

  private getCadenceKeyFromCron(
    cadence: AllocationCadence,
  ): keyof typeof AllocationCadence {
    return Object.keys(AllocationCadence).find(
      (key) =>
        AllocationCadence[key as keyof typeof AllocationCadence] === cadence,
    ) as keyof typeof AllocationCadence;
  }

  private getDateRangeForCadence(
    now: Date,
    cadenceKey: keyof typeof AllocationCadence,
  ): [Date, Date] {
    if (cadenceKey === 'MONTHLY') {
      return [
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 1),
      ];
    }
    return [
      new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    ];
  }

  private async runAllocationByCadence(
    allocationId: string,
    cadence: AllocationCadence,
  ): Promise<void> {
    const now = new Date();
    const cadenceKey = this.getCadenceKeyFromCron(cadence);

    const allocation = await this.allocationModel.findById(allocationId).exec();
    if (!allocation) {
      this.logger.warn(`Allocation config not found for ID ${allocationId}`);
      return;
    }

    const [start, end] = this.getDateRangeForCadence(now, cadenceKey);

    const existingRecord = await this.allocationRecordModel.findOne({
      type: cadenceKey,
      allocationId: allocation._id, 
      allocationDate: { $gte: start, $lt: end },
    });

    if (existingRecord?.status === 'success') {
      this.logger.warn(
        `(${cadenceKey}) Allocation execution: ${allocationId} already exists and is successful.`,
      );
      return;
    }

    if (existingRecord?.status === 'failed') {
      this.logger.warn(
        `(${cadenceKey}) Allocation execution: ${allocationId} previously failed. Retrying.`,
      );
      await this.executeAllocation(allocation, now, cadenceKey);
      return;
    }

    if (!existingRecord) {
      this.logger.log(
        `No prior allocation record found for ${allocationId}, executing allocation..`,
      );
      await this.executeAllocation(allocation, now, cadenceKey);
    }
  }

  private async executeAllocation(
    allocation: Allocation,
    now: Date,
    cadenceKey: keyof typeof AllocationCadence,
  ): Promise<void> {
    const session = await this.allocationModel.db.startSession();
    session.startTransaction();

    try {
      const { userIds: receiverIds } =
        await this.walletService.allocateCoinsToAll(
          allocation.allocationAmount,
        );

      await this.allocationRecordModel.create(
        [
          {
            allocationDate: now,
            allocationId: allocation._id,
            amount: allocation.allocationAmount,
            receiverIds,
            status: 'success',
            type: cadenceKey,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      this.logger.log(
        `(${cadenceKey}) Allocation complete for ID ${allocation._id}`,
      );
    } catch (error) {
      await session.abortTransaction();

      await this.allocationRecordModel.create({
        allocationId: allocation._id,
        allocationDate: now,
        amount: allocation.allocationAmount,
        receiverIds: [],
        status: 'failed',
        type: cadenceKey,
      });

      this.logger.error(
        `(${cadenceKey}) Allocation failed for ID ${allocation._id}: ${error.message}`,
        error.stack,
      );
    } finally {
      session.endSession();
    }
  }
}
