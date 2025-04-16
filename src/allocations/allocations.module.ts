import { Module } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { AllocationsController } from './allocations.controller';
import { Allocation, AllocationRecord, AllocationRecordSchema, AllocationSchema } from './schema/Allocation.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from 'src/wallet/wallet.service';
import { Wallet, WalletSchema } from 'src/wallet/schema/Wallet.schema';
import { AllocationSeeder } from './seeds/allocation.seed';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from 'src/wallet/wallet.module';
import { AllocationCronService } from './allocation.cron.service';

@Module({
  imports: [
    WalletModule,
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: Allocation.name,
        schema: AllocationSchema,
      },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    MongooseModule.forFeature([
      { name: AllocationRecord.name, schema: AllocationRecordSchema },
    ]),
  ],
  controllers: [AllocationsController],
  providers: [AllocationsService, AllocationSeeder, AllocationCronService],
})
export class AllocationsModule {}
