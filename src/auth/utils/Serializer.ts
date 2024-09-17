import { Inject, Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: AuthService,
  ) {
    super();
  }

  serializeUser(user: any, done: (err: Error, user: any) => void) {
    done(null, user.email);
  }

  async deserializeUser(payload: any, done: (err: Error, user: any) => void) {
    // const user = await this.authService.findUser(payload.email);
    // return user ? done(null, user) : done(null, null);
  }
}
