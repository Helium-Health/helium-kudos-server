import {
  Body,
  Controller,
  Inject,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './utils/Guards';
import { LoginDto, RegisterDto } from './dto/ValidateUser.dto';

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

  @Post('/login')
  async loginWithEmailPassword(@Body() body: LoginDto) {
    return this.authService.validateEmailPassword(body.email, body.password);
  }

  @Post('/register')
  async register(@Body() body: RegisterDto) {
    return this.authService.registerUser(body.email, body.password, body.name);
  }
}
