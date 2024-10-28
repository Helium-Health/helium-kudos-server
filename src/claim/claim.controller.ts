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

@Controller('claim')
export class ClaimController {
  constructor(private readonly claimService: ClaimService) {}

  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  async approveClaim(@Param('id') claimId: Types.ObjectId) {
    await this.claimService.approveClaim(new Types.ObjectId(claimId));
    return { message: 'Claim approved successfully' };
  }

  @Get('health')
  healthCheck() {
    return { message: 'ClaimController is up and running' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  async rejectClaim(@Param('id') claimId: Types.ObjectId) {
    await this.claimService.rejectClaim(new Types.ObjectId(claimId));
    return { message: 'Claim rejected successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllClaims(
    @Query('userId') userId?: Types.ObjectId,
    @Query('status') status?: string,
  ): Promise<Claim[]> {
    return this.claimService.filterClaims(userId, status);
  }
}
