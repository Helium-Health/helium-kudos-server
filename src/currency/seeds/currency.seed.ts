import { Injectable, Logger } from '@nestjs/common';
import { CurrencyService } from '../currency.service'; // Adjust path as needed
import { CurrencyDto } from '../dto/currency.dto'; // Adjust path as needed

@Injectable()
export class CurrencySeeder {
  private readonly logger = new Logger(CurrencySeeder.name);

  constructor(private readonly currencyService: CurrencyService) {}

  async seed(): Promise<void> {
    const currencies: CurrencyDto[] = [{ currency: 'NGN', rate: 100 }];

    for (const currencyDto of currencies) {
      try {
        const currencyExists = await this.currencyService.findByCurrencyName(
          currencyDto.currency,
        );

        if (currencyExists) {
          this.logger.log(
            `Currency ${currencyDto.currency} already exists. Skipping.`,
          );
          continue;
        }

        await this.currencyService.create(currencyDto);
        this.logger.log(`Currency ${currencyDto.currency} has been created.`);
      } catch (error) {
        this.logger.error(
          `Failed to seed currency ${currencyDto.currency}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log('Currency seeding process completed.');
  }
}
