import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AllocationRecord } from './schema/Allocation.schema';
import { WalletService } from 'src/wallet/wallet.service';

import { Cadence } from 'src/constants';
import { MilestoneService } from 'src/milestone/milestone.service';
import {
  Milestone,
  MilestoneDocument,
} from 'src/milestone/schema/Milestone.schema';

@Injectable()
export class AllocationCronService {
  private readonly logger = new Logger(AllocationCronService.name);

  constructor(
    private readonly milestoneService: MilestoneService,
    private readonly walletService: WalletService,
    @InjectModel(AllocationRecord.name)
    private readonly allocationRecordModel: Model<AllocationRecord>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleGenericAllocationCron(): Promise<void> {
    const milestoneIds =
      await this.milestoneService.getMilestoneIdsWithCadence();

    for (const milestoneId of milestoneIds) {
      const milestone =
        await this.milestoneService.findMilestoneById(milestoneId);
      if (!milestone) {
        this.logger.warn(`Milestone not found for ID ${milestoneId}`);
        continue;
      }

      if (this.shouldRunAllocation(milestone.cadence)) {
        await this.runAllocationByCadence(milestone, milestone.cadence);
      }
    }
  }

  private shouldRunAllocation(cadence: Cadence): boolean {
    return [Cadence.DAILY, Cadence.MONTHLY].includes(cadence);
  }

  private getCadenceKeyFromCron(cadence: Cadence): keyof typeof Cadence {
    return Object.keys(Cadence).find(
      (key) => Cadence[key as keyof typeof Cadence] === cadence,
    ) as keyof typeof Cadence;
  }

  private getDateRangeForCadence(
    now: Date,
    cadenceKey: keyof typeof Cadence,
  ): [Date, Date] {
    let start: Date;
    let end: Date;

    if (cadenceKey === 'MONTHLY') {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    } else {
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
      );
    }

    this.logger.debug(
      `Cadence ${cadenceKey} -> Date range: ${start.toISOString()} to ${end.toISOString()}`,
    );

    return [start, end];
  }

  async runAllocationByCadence(
    milestone: MilestoneDocument,
    cadence: Cadence,
  ): Promise<'success' | 'skipped' | 'failed'> {
    const now = new Date();
    const cadenceKey = this.getCadenceKeyFromCron(cadence);

    const [start, end] = this.getDateRangeForCadence(now, cadenceKey);

    const existingRecord = await this.allocationRecordModel.findOne({
      type: cadenceKey,
      milestoneId: milestone._id,
      allocationDate: { $gte: start, $lt: end },
    });

    if (existingRecord?.status === 'success') {
      this.logger.warn(
        `(${cadenceKey}) Allocation execution: ${milestone._id} already exists for present period and is successful.`,
      );
      return 'skipped';
    }

    if (existingRecord?.status === 'failed') {
      this.logger.warn(
        `(${cadenceKey}) Allocation execution: ${milestone._id} previously failed. Retrying.`,
      );
      await this.executeAllocation(milestone, now, cadenceKey);
      return 'failed';
    }

    if (!existingRecord) {
      this.logger.log(
        `No prior allocation record found for ${milestone._id} for this period, executing allocation..`,
      );
      await this.executeAllocation(milestone, now, cadenceKey);
      return 'success';
    }
  }

  private async executeAllocation(
    milestone: MilestoneDocument,
    now: Date,
    cadenceKey: keyof typeof Cadence,
  ): Promise<void> {
    const session = await this.allocationRecordModel.db.startSession();
    session.startTransaction();

    try {
      const { userIds: receiverIds } =
        await this.walletService.allocateCoinsToAll(milestone.coins);

      await this.allocationRecordModel.create(
        [
          {
            allocationDate: now,
            milestoneId: milestone._id,
            amount: milestone.coins,
            receiverIds,
            status: 'success',
            type: cadenceKey,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      this.logger.log(
        `(${cadenceKey}) Allocation completed for ID ${milestone._id}`,
      );
    } catch (error) {
      await session.abortTransaction();

      console.log('milestone', milestone._id);
      await this.allocationRecordModel.create({
        milestoneId: milestone._id,
        allocationDate: now,
        amount: milestone.coins,
        receiverIds: [],
        status: 'failed',
        type: cadenceKey,
      });

      this.logger.error(
        `(${cadenceKey}) Allocation failed for ID ${milestone._id}: ${error.message}`,
        error.stack,
      );
    } finally {
      session.endSession();
    }
  }
}
