import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AllocateCoinsToUserDto } from './dto/wallet.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { Types } from 'mongoose';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getUserBalances(@Request() req) {
    const userId = req.user.userId;
    return this.walletService.getUserBalances(new Types.ObjectId(userId));
  }

  @Get('earned-coins/')
  async getEarnedCoinBalance(@Request() req) {
    const userId = req.user.userId;
    return this.walletService.getEarnedCoinBalance(new Types.ObjectId(userId));
  }

  @Get('available-coins/')
  async getAvailableToGiveBalance(@Request() req) {
    const userId = req.user.userId;
    return this.walletService.getAvailableToGive(new Types.ObjectId(userId));
  }

  @Post('admin/allocate-coins-to-all')
  async allocateCoinsToAll(
    @Body() allocateCoinsToAllDto: AllocateCoinsToUserDto,
  ) {
    return this.walletService.allocateCoinsToAll(
      allocateCoinsToAllDto.allocation,
    );
  }

  @Post('admin/allocate-coins/:userId')
  async allocateCoinsToSpecificUser(
    @Param('userId') userId: Types.ObjectId,
    @Body() allocateCoinsToUserDto: AllocateCoinsToUserDto,
  ) {
    return this.walletService.allocateCoinsToSpecificUser(
      new Types.ObjectId(userId),
      allocateCoinsToUserDto.allocation,
    );
  }
}
