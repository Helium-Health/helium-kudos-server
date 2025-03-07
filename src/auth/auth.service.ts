import {
  forwardRef,
  HttpException,
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
    this.auth0UserInfo = new UserInfoClient({
      domain: process.env.AUTH0_DOMAIN,
    });
  }

  async validateGoogleUser(
    token: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      this.logger.log('Validating Google user...');
      let userDetails = null;

      const googleAuth = await this.oauthClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = googleAuth.getPayload();

      const userExists = await this.userService.findByEmail(payload.email);

      if (!userExists) {
        this.logger.log('User not found. Creating...');
        const { newUser } = await this.userService.createUser({
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          verified: payload?.email_verified || true,
        });
        userDetails = newUser;
      } else {
        this.logger.log('User Exist ...');
        if (!userExists.active) {
          this.logger.log('User Exist, but not active');
          throw new UnauthorizedException(
            'Your account is currently inactive. Contact Administrator for assistance.',
          );
        }

        if (!userExists.verified) {
          this.logger.log(
            'Unverified user exists. Updating with Google data...',
          );
          await this.userService.updateByEmail(
            payload.email,
            {
              picture: payload.picture,
              verified: payload.email_verified || true,
            },
          );
        }
      }
      const user = userExists || userDetails;
      const refreshToken = await this.generateAndStoreRefreshToken(user);
      const accessToken = this.generateJwtToken(user);
      return { user, refreshToken, accessToken };
    } catch (e) {
      throw new HttpException(
        'Error in validating google user: ' + e.message,
        400,
      );
    }
  }

  async validateAuth0User(
    token: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      this.logger.log('Validating Auth0 user...');
      const userInfo = await this.auth0UserInfo.getUserInfo(token);
      let userDetails = null;

      const userExists = await this.userService.findByEmail(
        userInfo.data.email,
      );

      if (!userExists) {
        this.logger.log('User not found. Creating...');
        // Temporarily prevent user account creation with support for User invitation
        // const { newUser } = await this.userService.createUser({
        //   email: userInfo.data.email,
        //   name: userInfo.data.name,
        //   picture: userInfo.data.picture,
        //   verified: userInfo.data?.email_verified || true,
        // });
        // userDetails = newUser;
      } else {
        this.logger.log('User Exist ...');
        if (!userExists.active) {
          this.logger.log('User Exist but not active ...');
          throw new UnauthorizedException(
            'Your account is currently inactive. Contact Administrator for assistance.',
          );
        }

        if (!userExists.verified) {
          this.logger.log(
            'Unverified user exists. Updating with Auth0 data...',
          );
          await this.userService.updateByEmail(
            userInfo.data.email,
            {
              picture: userInfo.data.picture,
              verified: userInfo.data.email_verified || true,
            },
          );
        }
      }
      const user = userExists || userDetails;
      const refreshToken = await this.generateAndStoreRefreshToken(user);
      const accessToken = this.generateJwtToken(user);
      return { user, refreshToken, accessToken };
    } catch (e) {
      throw new HttpException(
        'Error in validating google user: ' + e.message,
        400,
      );
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
      throw new UnauthorizedException(
        'Could not refresh access token',
        e.message,
      );
    }
  }

  async logout(userId: Types.ObjectId): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $unset: { refreshToken: 1 } },
    );
  }
}
