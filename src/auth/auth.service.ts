import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/users/schema/User.schema';
import { UsersService } from 'src/users/users.service';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UserInfoClient } from 'auth0';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private oauthClient: OAuth2Client;
  private auth0UserInfo: UserInfoClient;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => UsersService)) private userService: UsersService,
  ) {
    this.oauthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    // this.auth0UserInfo = new UserInfoClient({
    //   domain:
    //     process.env.NODE_ENV === 'production'
    //       ? PROD_AUTH0_DOMAIN
    //       : STAGING_AUTH0_DOMAIN,
    // });

    this.auth0UserInfo = new UserInfoClient({
      domain: process.env.AUTH0_DOMAIN,
    });
  }

  async validateGoogleUser(
    token: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      let userDetails = null;
      let refreshToken = null;

      const googleAuth = await this.oauthClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = googleAuth.getPayload();

      const userExists = await this.userService.findByEmail(payload.email);

      if (!userExists?.active) {
        throw new UnauthorizedException(
          'Your account is currently inactive. Contact Administrator for assistance.',
        );
      }

      if (userExists) {
        if (userExists.verified) {
          this.logger.log('Verified user exists. Getting...');
          userDetails = userExists;
          refreshToken = await this.generateAndStoreRefreshToken(userDetails);
        } else {
          this.logger.log(
            'Unverified user exists. Updating with Google data...',
          );

          const updatedUser = await this.userService.updateByEmail(
            payload.email,
            {
              picture: payload.picture,
              verified: payload.email_verified || false,
            },
          );
          userDetails = updatedUser;
          refreshToken = await this.generateAndStoreRefreshToken(updatedUser);
        }
      } else {
        this.logger.log('User not found. Creating...');
        const { newUser, newUserRefreshToken } =
          await this.userService.createUser({
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            verified: payload.email_verified || false,
          });
        userDetails = newUser;
        refreshToken = newUserRefreshToken;
      }

      const jwtToken = this.generateJwtToken(userDetails);

      return {
        user: userDetails,
        accessToken: jwtToken,
        refreshToken: refreshToken,
      };
    } catch (e) {
      this.logger.log('Error in validateUser', e);
      throw new Error('Error in validateUser');
    }
  }

  async validateAuth0User(
    token: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      const userInfo = await this.auth0UserInfo.getUserInfo(token);
      let userDetails = null;
      let refreshToken = null;

      const userExists = await this.userService.findByEmail(
        userInfo.data.email,
      );

      if (!userExists?.active) {
        throw new UnauthorizedException(
          'Your account is currently inactive. Contact Administrator for assistance.',
        );
      }

      if (userExists) {
        if (userExists.verified) {
          this.logger.log('Verified user exists. Getting...');
          userDetails = userExists;
          refreshToken = await this.generateAndStoreRefreshToken(userDetails);
        } else {
          this.logger.log(
            'Unverified user exists. Updating with Auth0 data...',
          );

          const updatedUser = await this.userService.updateByEmail(
            userInfo.data.email,
            {
              picture: userInfo.data.picture,
              verified: true,
            },
          );
          userDetails = updatedUser;
          refreshToken = await this.generateAndStoreRefreshToken(updatedUser);
        }
      } else {
        this.logger.log('User not found. Creating...');
        const { newUser, newUserRefreshToken } =
          await this.userService.createUser({
            email: userInfo.data.email,
            name: userInfo.data.name,
            picture: userInfo.data.picture,
            verified: true,
          });
        userDetails = newUser;
        refreshToken = newUserRefreshToken;
      }

      const jwtToken = this.generateJwtToken(userDetails);

      return {
        user: userDetails,
        accessToken: jwtToken,
        refreshToken: refreshToken,
      };
    } catch (e) {
      this.logger.log('Error in validateAuth0User', e);
      throw new Error('Error in validateAuth0User');
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
    const payload = { email: user.email, sub: user._id, role: user.role };
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '4d' });

    const hashedToken = await argon2.hash(refreshToken);

    await this.userModel.updateOne(
      { _id: user._id },
      { refreshToken: hashedToken },
    );

    return refreshToken;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ newAccessToken: string; newRefreshToken: string }> {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.userModel
        .findById(decoded.sub)
        .select('+refreshToken')
        .exec();

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Refresh token is invalid or expired');
      }

      const isValid = await argon2.verify(user.refreshToken, refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const newAccessToken = await this.generateJwtToken(user);
      const newRefreshToken = await this.generateAndStoreRefreshToken(user);

      return { newAccessToken, newRefreshToken };
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
