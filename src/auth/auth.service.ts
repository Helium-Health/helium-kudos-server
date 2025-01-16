import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
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
      const refreshToken = await this.generateAndStoreRefreshToken(userDetails);

      return {
        user: userDetails,
        accessToken: jwtToken,
        refreshToken: refreshToken,
      };
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

  async generateAndStoreRefreshToken(
    user: User & { _id: Types.ObjectId },
  ): Promise<string> {
    const payload = { email: user.email, sub: user._id };
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const hashedToken = await argon2.hash(refreshToken);

    await this.userModel.updateOne(
      { _id: user._id },
      { refreshToken: hashedToken },
    );

    return refreshToken;
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.userModel.findById(decoded.sub);

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Refresh token is invalid or expired');
      }

      const isValid = await argon2.verify(user.refreshToken, refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newRefreshToken = await this.generateAndStoreRefreshToken(user);

      return this.generateJwtToken(user);
    } catch (e) {
      console.error('Error in refreshAccessToken:', e.message);
      throw new UnauthorizedException('Could not refresh access token');
    }
  }

  async logout(userId: Types.ObjectId): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $unset: { refreshToken: 1 } },
    );
  }
}
