import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ClaimService } from './claim.service';
import { Types } from 'mongoose';
import { Claim } from './schema/claim.schema';

@Controller('claim')
export class ClaimController {
  constructor(private readonly claimService: ClaimService) {}
  @Get('pending')
  async getPendingClaims(): Promise<Claim[]> {
    return this.claimService.getPendingClaims();
  }

  @Patch(':id/approve')
  async approveClaim(@Param('id') claimId: Types.ObjectId) {
    await this.claimService.approveClaim(new Types.ObjectId(claimId));
    return { message: 'Claim approved successfully' };
  }

  @Patch(':id/reject')
  async rejectClaim(@Param('id') claimId: Types.ObjectId) {
    await this.claimService.rejectClaim(new Types.ObjectId(claimId));
    return { message: 'Claim rejected successfully' };
  }
  @Get('filter')
  async filterClaims(
    @Query('userId') userId?: Types.ObjectId,
    @Query('status') status?: string,
  ): Promise<Claim[]> {
    return this.claimService.filterClaims(userId, status);
  }
}
