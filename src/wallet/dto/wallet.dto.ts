import { IsNumber, IsPositive } from 'class-validator';

export class AllocateCoinsToAllDto {
  @IsNumber()
  @IsPositive()
  allocation: number;
}
export class AllocateCoinsToUserDto {
  @IsNumber()
  @IsPositive()
  allocation: number;
}
