import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext) {
    const activate = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();
    await super.logIn(request);
    return activate;
  }
}

// import {
//   ExecutionContext,
//   Inject,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { AuthService } from '../auth.service';

// @Injectable()
// export class GoogleAuthGuard extends AuthGuard('google') {
//   constructor(
//     @Inject('AUTH_SERVICE') private readonly authService: AuthService,
//   ) {
//     super();
//   }

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const request = context.switchToHttp().getRequest();
//     const token = request.body.token;

//     if (!token) {
//       throw new UnauthorizedException('No token provided');
//     }

//     try {
//       const user = await this.authService.validateUser(token);
//       request.user = user;
//       return true;
//     } catch {
//       throw new UnauthorizedException('Invalid token');
//     }
//   }
// }
