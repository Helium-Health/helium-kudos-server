import { Module } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { Currency, CurrencySchema } from 'src/currency/schema/Currency.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CurrencySeeder } from './seeds/currency.seed';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Currency.name, schema: CurrencySchema },
    ]),
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService, CurrencySeeder],
  exports: [CurrencyService],
})
export class CurrencyModule {}
