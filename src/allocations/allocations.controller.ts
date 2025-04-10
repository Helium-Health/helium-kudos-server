import {
  Controller,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import {
  BulkAllocationDto,
  UpdateAllocationDto,
} from './dto/update-allocation.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';

@Controller('allocations')
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

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

  @Post('users')
  async allocateToAllUsers(@Body() bulkAllocationDto: BulkAllocationDto) {
    return this.allocationsService.allocateCoinsToAllUsersManually(
      bulkAllocationDto.amount,
    );
  }
}
