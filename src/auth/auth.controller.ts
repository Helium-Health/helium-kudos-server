import { Controller, Inject, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './utils/Guards';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: AuthService,
  ) {}

  @Post('/login/google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin(@Request() req) {
    return req.user;
  }
}
