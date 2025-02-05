import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClaimService } from './claim.service';
import { Types } from 'mongoose';
import { Claim } from './schema/claim.schema';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@Controller('claim')
@UseGuards(JwtAuthGuard)
export class ClaimController {
  constructor(private readonly claimService: ClaimService) {}

  @UseGuards(AdminGuard)
  @Patch('approve-all')
  async approveAllClaims() {
    await this.claimService.approveAllClaims();
    return { message: 'All claims approved successfully' };
  }

  @UseGuards(AdminGuard)
  @Patch(':id/approve')
  async approveClaim(@Param('id') claimId: Types.ObjectId) {
    await this.claimService.approveClaim(new Types.ObjectId(claimId));
    return { message: 'Claim approved successfully' };
  }

  @UseGuards(AdminGuard)
  @Patch(':id/reject')
  async rejectClaim(@Param('id') claimId: Types.ObjectId) {
    await this.claimService.rejectClaim(new Types.ObjectId(claimId));
    return { message: 'Claim rejected successfully' };
  }

  @Get()
  async getAllClaims(
    @Query('userId') userId?: Types.ObjectId,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('recent') recent?: 'ASCENDING_ORDER' | 'DESCENDING_ORDER',
  ) {
    return this.claimService.filterClaims(
      userId ? new Types.ObjectId(userId) : undefined,
      status,
      page,
      limit,
      recent,
    );
  }
}
