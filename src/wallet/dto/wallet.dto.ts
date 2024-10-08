import { IsNumber, IsPositive } from 'class-validator';

export class AllocateCoinsToUserDto {
  @IsNumber()
  @IsPositive()
  allocation: number;
}
