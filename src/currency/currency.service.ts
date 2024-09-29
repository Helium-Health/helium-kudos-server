import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateCurrencyDto } from './dto/currency.dto';
import { UpdateCurrencyDto } from './dto/currency.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Currency } from 'src/currency/schema/Currency.schema';
import { Model } from 'mongoose';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectModel(Currency.name) private currencyModel: Model<Currency>,
  ) {}
  async create(createCurrencyDto: CreateCurrencyDto) {
    try {
      const currencyExist = await this.currencyModel.findOne({
        currencyName: createCurrencyDto.currencyName,
      });
      if (currencyExist) {
        throw new ConflictException(
          `Currency with name ${createCurrencyDto.currencyName} already exists`,
        );
      }
      const currency = new this.currencyModel({
        currencyName: createCurrencyDto.currencyName,
        coinToCurrency: createCurrencyDto.coinToCurrency,
      });

      return currency.save();
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create currency: ${error.message}`,
      );
    }
  }

  findAll() {
    return `This action returns all currency`;
  }

  findOne(id: number) {
    return `This action returns a #${id} currency`;
  }

  async update(updateCurrencyDto: UpdateCurrencyDto) {
    const currency = await this.currencyModel.findOne({
      currencyName: updateCurrencyDto.currencyName,
    });
    if (!currency) {
      throw new Error(
        `Currency with name ${updateCurrencyDto.currencyName} not found`,
      );
    }
    currency.currencyName = updateCurrencyDto.currencyName;
    currency.coinToCurrency = updateCurrencyDto.newCoinToCurrency;
    return currency.save();
  }

  remove(id: number) {
    return `This action removes a #${id} currency`;
  }

  async setCoinToCurrency(name: string, value: number) {
    let currency = await this.currencyModel.findById(name);
    if (!currency) {
      currency = new this.currencyModel();
    }
    currency.coinToCurrency = value;
    return currency.save();
  }
}
