// create-coin-eq.dto.ts
import { IsNumber, IsString, IsPositive } from 'class-validator';

export class CreateCoinEquivalentDto {
  @IsNumber()
  @IsPositive()
  value: number;
}

export class AllocateCoinsDto {
  @IsString()
  userId: string;

  @IsNumber()
  @IsPositive()
  allocation: number;
}

export class SendCoinsDto {
  @IsString()
  fromUserId: string;

  @IsString()
  toUserId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
