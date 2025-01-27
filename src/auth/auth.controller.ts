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
import { GoogleAuthGuard } from './utils/Guards';
import { Types } from 'mongoose';
import { LoginDto, RegisterDto } from './dto/ValidateUser.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: AuthService,
  ) {}

  @Post('/login/google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin(@Request() req) {
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

  @Post('/login')
  async loginWithEmailPassword(@Body() body: LoginDto) {
    return this.authService.validateEmailPassword(body.email, body.password);
  }

  @Post('/register')
  async register(@Body() body: RegisterDto) {
    return this.authService.registerUser(body.email, body.password, body.name);
  }

  @Post('/logout')
  async logout(@Request() req) {
    const userId = new Types.ObjectId(req.user.userId);
    return await this.authService.logout(userId);
  }
}
