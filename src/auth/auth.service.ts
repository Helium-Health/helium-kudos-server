import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/users/schema/User.schema';
import { UsersService } from 'src/users/users.service';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
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
    try {
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
    } catch (e) {
      console.log('Error in validateUser', e);
      throw new Error('Error in validateUser');
    }
  }

  generateJwtToken(
    user: User & {
      _id: Types.ObjectId;
    },
  ) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    return this.jwtService.sign(payload);
  }

  async registerUser(
    email: string,
    password: string,
    name: string,
  ): Promise<User> {
    try {
      const hashedPassword = await argon2.hash(password);

      const user = await this.userService.createUser({
        email,
        password: hashedPassword,
        name,
        verified: true,
      });

      return await this.userModel.findOne({
        email,
      });
    } catch (error) {
      if (error.code === 11000 && error.keyValue?.email) {
        throw new ConflictException('A user with this email already exists');
      }

      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  async validateEmailPassword(
    email: string,
    password: string,
  ): Promise<{ user: User; accessToken: string }> {
    const userExposed = await this.userModel
      .findOne({ email })
      .select('+password')
      .exec();

    const user = await this.userModel.findOne({
      email,
    });

    if (!user) {
      throw new UnauthorizedException('Email does not exist!');
    }

    const isPasswordValid = await argon2.verify(userExposed.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid  password!');
    }

    const jwtToken = this.generateJwtToken(
      user as User & { _id: Types.ObjectId },
    );

    return { user, accessToken: jwtToken };
  }
}
