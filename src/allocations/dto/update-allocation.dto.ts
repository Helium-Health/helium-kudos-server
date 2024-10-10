export class UpdateAllocationDto {
  readonly allocationAmount?: number; // Optional so you can update only what you need
  readonly cadence?: string; // Optional as well
}
