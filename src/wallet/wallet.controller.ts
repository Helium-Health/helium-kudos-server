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
   *This method is protected by JWT authentication.
   *
   * @param userId - The unique identifier of the user whose balances are to be fetched.
   * @returns A promise that resolves to the user's balance information.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':userId')
  async getUserBalances(@Param('userId') userId: Types.ObjectId) {
    return this.walletService.getUserBalances(userId);
  }

  /**
   * Retrives the earned coin balance for a specific user.
   * This method is protected by JWT authentication.
   *
   * @param userId - The ID of the user whose earned coin balance is to be retrieved.
   * @returns The earned coin balance of the specified user.
   */
  @UseGuards(JwtAuthGuard)
  @Get('earned-coins/:userId')
  async getEarnedCoinBalance(@Param('userId') userId: Types.ObjectId) {
    return this.walletService.getEarnedCoinBalance(userId);
  }

  /**
   * Retrives the available to give coin balance for a specific user.
   * This method is protected by JWT authentication.
   *
   * @param userId - The ID of the user whose earned coin balance is to be retrieved.
   * @returns The available to give coin balance of the specified user.
   */
  @UseGuards(JwtAuthGuard)
  @Get('available-coins/:userId')
  async getAvailableToGiveBalance(@Param('userId') userId: Types.ObjectId) {
    return this.walletService.getAvailableToGive(userId);
  }

  /**
   * Allocate coins to all users.
   * This endpoint is protected by JWT authentication.
   *
   * @param allocateCoins - Data Transfer Object containing the allocation details.
   * @returns A promise that resolves to the result of the coin allocation operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('admin/allocate-coins-to-all')
  async allocateCoinsToAll(@Body() allocateCoins: AllocateCoinsDto) {
    return this.walletService.allocateCoinsToAll(allocateCoins.allocation);
  }

  /**
   * Controller method to allocate coins to specific users.
   * This method is protected by JWT authentication.
   *
   * @param allocateCoins - Data Transfer Object containing user IDs and allocation details.
   * @returns A promise that resolves to the result of the coin allocation operation.
   */
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
