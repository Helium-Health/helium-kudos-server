import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CurrencyDto {
  @IsString()
  currency: string;

  @IsNumber()
  @IsPositive()
  rate: number;
}
