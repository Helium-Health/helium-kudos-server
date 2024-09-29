import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/users/schema/User.schema';
import { UsersService } from 'src/users/users.service';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService {
  private oauthClient: OAuth2Client;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private userService: UsersService,
  ) {
    this.oauthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
  }

  async validateUser(
    token: string,
  ): Promise<{ user: User; accessToken: string }> {
    let userDetails = null; // Todo use correct type
    const googleAuth = await this.oauthClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = googleAuth.getPayload();

    const userExists = await this.userModel.findOne({
      email: payload.email,
    });

    if (userExists) {
      console.log('User exists. Getting...');
      userDetails = userExists;
    } else {
      console.log('User not found. Creating...');
      userDetails = await this.userService.createUser({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        verified: payload.email_verified || false,
      });
    }

    const jwtToken = this.generateJwtToken(userDetails);
    return { user: userDetails, accessToken: jwtToken };
  }

  generateJwtToken(
    user: User & {
      _id: Types.ObjectId;
    },
  ) {
    const payload = { email: user.email, sub: user._id };
    return this.jwtService.sign(payload);
  }
}
