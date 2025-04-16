import {
  Controller,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
  Get,
} from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import {
  BulkAllocationDto,
  UpdateAllocationDto,
} from './dto/update-allocation.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { AllocationCronService } from './allocation.cron.service';

@Controller('allocations')
export class AllocationsController {
  constructor(
    private readonly allocationsService: AllocationsService,
    private readonly allocationCronService: AllocationCronService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createAllocationDto: CreateAllocationDto) {
    return this.allocationsService.create(createAllocationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAllocationDto: UpdateAllocationDto,
  ) {
    return this.allocationsService.update(id, updateAllocationDto);
  }

  @Post('manual-allocation')
  async allocateToAllUsers(@Query('allocationId') allocationId: string) {
    return this.allocationCronService.allocateCoinsToAllUsersManually(
      allocationId,
    );
  }

  @Get()
  async getAllAllocations() {
    return this.allocationsService.findAllAllocations();
  }
}
