import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  AllocateCoinsToAllDto,
  AllocateCoinsToUserDto,
} from './dto/wallet.dto';
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

  @UseGuards(JwtAuthGuard)
  @Post('admin/allocate-coins-to-all')
  async allocateCoinsToAll(
    @Body() allocateCoinsToAllDto: AllocateCoinsToAllDto,
  ) {
    return this.walletService.allocateCoinsToAll(
      allocateCoinsToAllDto.allocation,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/allocate-coins')
  async allocateCoinsToSpecificUser(
    @Body() allocateCoinsToUserDto: AllocateCoinsToUserDto,
  ) {
    return this.walletService.allocateCoinsToSpecificUser(
      allocateCoinsToUserDto.userId,
      allocateCoinsToUserDto.allocation,
    );
  }
}
