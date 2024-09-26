import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  AllocateCoinsDto,
  CreateCoinEquivalentDto,
  SendCoinsDto,
} from './dto/wallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get(':userEmail')
  async getUserBalances(@Param('userEmail') userEmail: string) {
    return this.walletService.getUserBalances(userEmail);
  }
  @Get('total-earned-coins/:userEmail')
  async getEarnedCoinBalance(@Param('userEmail') userEmail: string) {
    return this.walletService.getEarnedCoinBalance(userEmail);
  }
  @Get('available-to-give/:userEmail')
  async getAvailableToGiveBalance(@Param('userEmail') userEmail: string) {
    // return this.walletService.getAvailableToGiveBalance(userEmail);
    return this.walletService.calculateAvailableToGive(userEmail);
  }

  @Post('admin/set-coin-to-naira')
  async setCoinToNaira(
    @Body() createCoinEquivalentDto: CreateCoinEquivalentDto,
  ) {
    return this.walletService.setCoinToNaira(createCoinEquivalentDto.value);
  }

  @Post('admin/allocate-coins')
  async allocateCoins(@Body() allocateCoins: AllocateCoinsDto) {
    return this.walletService.allocateCoins(
      allocateCoins.userEmail,
      allocateCoins.allocation,
    );
  }

  @Post('send-coins')
  async sendCoins(@Body() sendCoinsDto: SendCoinsDto) {
    return this.walletService.sendCoins(
      sendCoinsDto.fromUserEmail,
      sendCoinsDto.toUserEmail,
      sendCoinsDto.amount,
    );
  }
}
