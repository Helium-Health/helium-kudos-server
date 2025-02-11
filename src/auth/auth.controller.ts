import {
  Body,
  Headers,
  Controller,
  Inject,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';

import { Types } from 'mongoose';
import { Auth0AuthGuard } from './utils/Guards';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: AuthService,
  ) {}

  @Post('/login/auth0')
  @UseGuards(Auth0AuthGuard)
  async auth0Login(@Request() req) {
    const user = req.user;
    return { user };
  }

  @Post('/refresh-token')
  async refreshAccessToken(@Headers('authorization') authorization: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header is missing or invalid',
      );
    }
    const refreshToken = authorization.split(' ')[1];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    return await this.authService.refreshAccessToken(refreshToken);
  }

  @Post('/logout')
  async logout(@Request() req) {
    const userId = new Types.ObjectId(req.user.userId);
    return await this.authService.logout(userId);
  }
}
