import {
  Body,
  Controller,
  Inject,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './utils/Guards';
import { Types } from 'mongoose';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: AuthService,
  ) {}

  @Post('/login/google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin(@Request() req) {
    const user = req.user;
    const accessToken = this.authService.generateJwtToken(user);
    const refreshToken =
      await this.authService.generateAndStoreRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  @Post('/refresh-token')
  async refreshAccessToken(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    return await this.authService.refreshAccessToken(refreshToken);
  }

  @Post('/logout')
  async logout(@Request() req) {
    const userId = new Types.ObjectId(req.user.userId);
    return await this.authService.logout(userId);
  }
}
