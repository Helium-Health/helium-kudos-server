import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/schemas/User.schema';
import { UsersService } from 'src/users/users.service';
import { UserDetails } from 'src/utils/types';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private userService: UsersService,
  ) {}
  async validateUser(details: UserDetails) {
    console.log('Authservice:::');
    console.log(details);
    const user = await this.userModel.findOne({ email: details.email });
    console.log(user);
    if (user) return user;
    console.log('User not found. Creating...');
    const newUser = this.userModel.create(details);
    return (await newUser).save;
  }
  async findUser(id: number) {
    const user = await this.userModel.findById(id);
    return user;
  }
}

// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { User } from 'src/schemas/User.schema';
// import { UsersService } from 'src/users/users.service';
// import { OAuth2Client } from 'google-auth-library';
// @Injectable()
// export class AuthService {
//   private oauthClient: OAuth2Client;

//   constructor(
//     @InjectModel(User.name) private userModel: Model<User>,
//     private userService: UsersService,
//   ) {
//     this.oauthClient = new OAuth2Client(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET,
//     );
//   }

//   async validateUser(token: string): Promise<User> {
//     const googleAuth = await this.oauthClient.verifyIdToken({
//       idToken: token,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const payload = googleAuth.getPayload();

//     const userExists = await this.userModel.findOne({
//       email: payload.email,
//     });

//     console.log('User exists. Getting...');
//     if (userExists) return userExists;

//     console.log('User not found. Creating...');

//     const createdUser = await this.userService.createUser({
//       email: payload.email,
//       name: payload.name,
//       picture: payload.picture,
//       verified: payload.email_verified || false,
//     });

//     return createdUser;
//   }
// }
