import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  AllocateCoinsToAllDto,
  AllocateCoinsToUserDto,
} from './dto/wallet.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { Types } from 'mongoose';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get(':userId')
  async getUserBalances(@Param('userId') userId: Types.ObjectId) {
    return this.walletService.getUserBalances(userId);
  }

  @Get('earned-coins/:userId')
  async getEarnedCoinBalance(@Param('userId') userId: Types.ObjectId) {
    return this.walletService.getEarnedCoinBalance(userId);
  }

  @Get('available-coins/:userId')
  async getAvailableToGiveBalance(@Param('userId') userId: Types.ObjectId) {
    return this.walletService.getAvailableToGive(userId);
  }

  @Post('admin/allocate-coins-to-all')
  async allocateCoinsToAll(
    @Body() allocateCoinsToAllDto: AllocateCoinsToAllDto,
  ) {
    return this.walletService.allocateCoinsToAll(
      allocateCoinsToAllDto.allocation,
    );
  }

  @Post('admin/allocate-coins:userId')
  async allocateCoinsToSpecificUser(
    @Param('userId') userId: Types.ObjectId,
    @Body() allocateCoinsToUserDto: AllocateCoinsToUserDto,
  ) {
    return this.walletService.allocateCoinsToSpecificUser(
      userId,
      allocateCoinsToUserDto.allocation,
    );
  }
}
