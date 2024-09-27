import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  AllocateCoinsDto,
  AllocateCoinsToUsersDto,
  // SetCoinToNairaDto,
} from './dto/wallet.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':userEmail')
  async getUserBalances(@Param('userEmail') userEmail: string) {
    return this.walletService.getUserBalances(userEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Get('total-earned-coins/:userEmail')
  async getEarnedCoinBalance(@Param('userEmail') userEmail: string) {
    return this.walletService.getEarnedCoinBalance(userEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Get('available-to-give/:userEmail')
  async getAvailableToGiveBalance(@Param('userEmail') userEmail: string) {
    return this.walletService.getAvailableToGiveBalance(userEmail);
  }

  // @UseGuards(JwtAuthGuard)
  // @Post('admin/set-coin-to-naira')
  // async setCoinToNaira(@Body() setCoinToNairaDto: SetCoinToNairaDto) {
  //   return this.walletService.setCoinToNaira(setCoinToNairaDto.exchangeValue);
  // }

  @UseGuards(JwtAuthGuard)
  @Post('admin/allocate-coins')
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
      allocateCoins.userEmails,
      allocateCoins.allocation,
    );
  }
}
