import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Currency } from 'src/currency/schema/Currency.schema';
import { Model } from 'mongoose';
import { CurrencyDto } from './dto/currency.dto';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectModel(Currency.name) private currencyModel: Model<Currency>,
  ) {}
  async create(currencyDto: CurrencyDto) {
    try {
      const currencyExist = await this.currencyModel.findOne({
        currency: currencyDto.currency,
      });
      if (currencyExist) {
        throw new ConflictException(
          `Currency with name ${currencyDto.currency} already exists`,
        );
      }
      const currency = new this.currencyModel({
        currencyName: currencyDto.currency,
        coinToCurrency: currencyDto.rate,
      });

      return currency.save();
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create currency: ${error.message}`,
      );
    }
  }

  async getCurrency(currencyName: string): Promise<Currency | null> {
    return this.currencyModel.findOne({ currency: currencyName }).exec();
  }

  async update(currencyDto: CurrencyDto) {
    const currency = await this.currencyModel.findOne({
      currency: currencyDto.currency,
    });
    if (!currency) {
      throw new Error(`Currency with name ${currencyDto.currency} not found`);
    }
    currency.currency = currencyDto.currency;
    currency.rate = currencyDto.rate;
    return currency.save();
  }
}
