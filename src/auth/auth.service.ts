import { Injectable } from '@nestjs/common';
// import { UsersService } from 'src/users/users.service';
// import { OAuth2Client } from 'google-auth-library';
import { UserDetails } from 'src/utils/type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/typeorm/entities/User';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}
  async validateUser(details: UserDetails) {
    console.log('AuthService');
    console.log(details);
    const user = await this.userRepository.findOneBy({ email: details.email });
    console.log(user);

    if (user) return user;

    console.log('User not found. Creating ...');
    const newUser = this.userRepository.create(details);
    return this.userRepository.save(newUser);
  }

  // private oauthClient: OAuth2Client;

  // constructor(
  //   @InjectModel(User.name) private userModel: Model<User>,
  //   private userService: UsersService,
  // ) {
  //   this.oauthClient = new OAuth2Client(
  //     process.env.GOOGLE_CLIENT_ID,
  //     process.env.GOOGLE_CLIENT_SECRET,
  //   );
  // }

  // async validateUser(token: string): Promise<User> {
  //   const googleAuth = await this.oauthClient.verifyIdToken({
  //     idToken: token,
  //     audience: process.env.GOOGLE_CLIENT_ID,
  //   });

  //   const payload = googleAuth.getPayload();

  //   const userExists = await this.userModel.findOne({
  //     email: payload.email,
  //   });

  //   console.log('User exists. Getting...');
  //   if (userExists) return userExists;

  //   console.log('User not found. Creating...');

  //   const createdUser = await this.userService.createUser({
  //     email: payload.email,
  //     name: payload.name,
  //     picture: payload.picture,
  //     verified: payload.email_verified || false,
  //   });

  //   return createdUser;
  // }
}
