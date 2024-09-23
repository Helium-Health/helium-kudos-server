import { Inject, Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { User } from 'src/schemas/User.schema';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: AuthService,
  ) {
    super();
  }

  serializeUser(user: User, done: (err: Error, user: any) => void) {
    console.log('Seriliaze User:::');
    console.log(user);
    done(null, user);
  }

  async deserializeUser(payload: any, done: (err: Error, user: any) => void) {
    const user = await this.authService.findUser(payload._id);
    console.log('Deserilize User:::');
    console.log(user);
    console.log('Deserialization Complete');
    return user ? done(null, user) : done(null, null);
  }
}
