import {
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class Auth0AuthGuard extends AuthGuard('jwt') {
  constructor(
    @Inject('AUTH_SERVICE') private authService: AuthService,
    private readonly reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('Auth0AuthGuard triggered');

    const request = context.switchToHttp().getRequest();
    console.log('Incoming Headers:', request.headers);

    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      console.error('No token provided');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const user = await this.authService.validateUser(token);
      request.user = user;
      console.log('User authenticated:', user);
      return true;
    } catch (error) {
      console.error('Token verification failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
