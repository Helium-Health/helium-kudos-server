import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AllocateCoinsDto, AllocateCoinsToUsersDto } from './dto/wallet.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { Types } from 'mongoose';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Retrieves the balance information for a specific user.
   *
   * @param userId - The unique identifier of the user whose balances are to be fetched.
   * @returns A promise that resolves to the user's balance information.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':userId')
  async getUserBalances(@Param('userId') userId: Types.ObjectId) {
    return this.walletService.getUserBalances(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('earned-coins/:userId')
  async getEarnedCoinBalance(@Param('userId') userId: Types.ObjectId) {
    return this.walletService.getEarnedCoinBalance(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('available-coins/:userId')
  async getAvailableToGiveBalance(@Param('userId') userId: Types.ObjectId) {
    return this.walletService.getAvailableToGive(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/allocate-coins-to-all')
  async allocateCoinsToAll(@Body() allocateCoins: AllocateCoinsDto) {
    return this.walletService.allocateCoinsToAll(allocateCoins.allocation);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/allocate-coins-to-users')
  async allocateCoinsToSpecificUsers(
    @Body() allocateCoins: AllocateCoinsToUsersDto,
  ) {
    return this.walletService.allocateCoinsToSpecificUsers(
      allocateCoins.userIds,
      allocateCoins.allocation,
    );
  }
}
