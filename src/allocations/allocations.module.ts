import { Module } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { AllocationsController } from './allocations.controller';
import {
  AllocationRecord,
  AllocationRecordSchema,
} from './schema/Allocation.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from 'src/wallet/wallet.module';
import { AllocationCronService } from './allocation.cron.service';
import { MilestoneModule } from 'src/milestone/milestone.module';

@Module({
  imports: [
    WalletModule,
    ConfigModule,
    MilestoneModule,
    MongooseModule.forFeature([
      { name: AllocationRecord.name, schema: AllocationRecordSchema },
    ]),
  ],
  controllers: [AllocationsController],
  providers: [AllocationsService, AllocationCronService],
})
export class AllocationsModule {}
