import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  currencyName: string;

  @IsNumber()
  @IsPositive()
  coinToCurrency: number;
}
export class UpdateCurrencyDto {
  @IsString()
  currencyName: string;

  @IsNumber()
  @IsPositive()
  newCoinToCurrency: number;
}
