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

  @Get(':userId')
  async getUserBalances(@Param('userId') userId: string) {
    return this.walletService.getUserBalances(userId);
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
      allocateCoins.userId,
      allocateCoins.allocation,
    );
  }

  @Post('send-coins')
  async sendCoins(@Body() sendCoinsDto: SendCoinsDto) {
    return this.walletService.sendCoins(
      sendCoinsDto.fromUserId,
      sendCoinsDto.toUserId,
      sendCoinsDto.amount,
    );
  }
}
