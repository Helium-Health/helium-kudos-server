import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { AllocationCadence } from '../schema/Allocation.schema';

export class UpdateAllocationDto {
  @IsNotEmpty()
  @IsString()
  allocationName: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  allocationAmount: number;

  @IsNotEmpty()
  @IsEnum(AllocationCadence, {
    message: `cadence must be one of: ${Object.keys(AllocationCadence).join(', ')}`,
  })
  cadence: keyof typeof AllocationCadence;
}

export class BulkAllocationDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;
}
