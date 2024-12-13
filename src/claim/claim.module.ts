import { forwardRef, Module } from '@nestjs/common';
import { ClaimService } from './claim.service';
import { ClaimController } from './claim.controller';
import { Claim, ClaimSchema } from './schema/claim.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionModule } from 'src/transaction/transaction.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { UsersModule } from 'src/users/users.module';
import { RecognitionModule } from 'src/recognition/recognition.module';

@Module({
  imports: [
    forwardRef(() => RecognitionModule),
    UsersModule,
    TransactionModule,
    WalletModule,
    MongooseModule.forFeature([{ name: Claim.name, schema: ClaimSchema }]),
  ],
  controllers: [ClaimController],
  providers: [ClaimService],
  exports: [ClaimService],
})
export class ClaimModule {}
