import { Module } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { AllocationsController } from './allocations.controller';
import { Allocation, AllocationSchema } from './schema/Allocation.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from 'src/wallet/wallet.service';
import { Wallet, WalletSchema } from 'src/wallet/schema/Wallet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Allocation.name,
        schema: AllocationSchema,
      },
      { name: Wallet.name, schema: WalletSchema },
    ]),
  ],
  controllers: [AllocationsController],
  providers: [AllocationsService, WalletService],
})
export class AllocationsModule {}
