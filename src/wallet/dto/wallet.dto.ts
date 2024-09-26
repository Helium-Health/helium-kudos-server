// create-coin-eq.dto.ts
import { IsNumber, IsString, IsPositive } from 'class-validator';

export class CreateCoinEquivalentDto {
  @IsNumber()
  @IsPositive()
  value: number;
}

export class AllocateCoinsDto {
  @IsString()
  userEmail: string;

  @IsNumber()
  @IsPositive()
  allocation: number;
}

export class SendCoinsDto {
  @IsString()
  fromUserEmail: string;

  @IsString()
  toUserEmail: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
