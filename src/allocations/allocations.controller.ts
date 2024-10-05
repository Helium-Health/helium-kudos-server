import { Controller, Post, Body, Param, Patch } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';

@Controller('allocations')
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  // POST /allocations
  // {
  //   "allocationAmount": 1000,
  //   "cadence": "0 0 1 * *"  // First day of every month at midnight
  // }
  @Post()
  create(@Body() createAllocationDto: CreateAllocationDto) {
    return this.allocationsService.create(createAllocationDto);
  }

  //   PATCH /allocations/{id}
  // {
  //   "cadence": "0 0 * * *"  // Every day at midnight
  // }
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAllocationDto: UpdateAllocationDto,
  ) {
    return this.allocationsService.update(id, updateAllocationDto);
  }
}
