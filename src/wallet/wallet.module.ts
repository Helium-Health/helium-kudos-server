import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema } from 'src/schemas/wallet.schema';
import { Coin, CoinSchema } from 'src/schemas/coin.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Currency, CurrencySchema } from 'src/schemas/Currency.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Coin.name, schema: CoinSchema },
      { name: User.name, schema: UserSchema },
      { name: Currency.name, schema: CurrencySchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
