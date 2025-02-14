import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class UpdateAllocationDto {
  readonly allocationAmount?: number; // Optional so you can update only what you need
  readonly cadence?: string; // Optional as well
}

export class BulkAllocationDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;
}