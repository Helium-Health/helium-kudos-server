import { IsNumber, IsString, IsPositive } from 'class-validator';

export class AllocateCoinsDto {
  @IsString()
  userEmail: string;

  @IsNumber()
  @IsPositive()
  allocation: number;
}
export class AllocateCoinsToUsersDto {
  allocation: number;
  userEmails: string[];
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
export class SetCoinToNairaDto {
  @IsNumber()
  @IsPositive()
  exchangeValue: number;
}
