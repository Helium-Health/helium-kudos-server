import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/users/schema/User.schema';
import { UsersService } from 'src/users/users.service';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
@Injectable()
export class AuthService {
  private jwksClient: jwksClient.JwksClient;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => UsersService)) private userService: UsersService,
  ) {
    this.jwksClient = jwksClient({
      jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    });
  }

  private async getKey(kid: string) {
    const key = await this.jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }

  // async validateUser(
  //   token: string,
  // ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  //   if (!token) {
  //     throw new UnauthorizedException('No token provided');
  //   }

  //   try {
  //     const decoded = jwt.decode(token, { complete: true });
  //     if (!decoded) throw new UnauthorizedException('Invalid token format');

  //     console.log('Decoded token:', decoded); // Debugging: See token contents

  //     const kid = decoded?.header.kid;
  //     if (!kid) {
  //       throw new UnauthorizedException('Invalid token (no kid found)');
  //     }

  //     const publicKey = await this.getKey(kid);

  //     const verified = jwt.verify(token, publicKey, {
  //       algorithms: ['RS256'],
  //       audience: process.env.AUTH0_AUDIENCE, 
  //       issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  //     }) as any;

  //     console.log('Verified token:', verified);

  //     const user = await this.userModel.findOne({ email: verified.email });
  //     if (!user) {
  //       throw new UnauthorizedException('User not found');
  //     }
  //     const accessToken = this.generateJwtToken(user);
  //     const refreshToken = await this.generateAndStoreRefreshToken(user);
  //     return { user, accessToken, refreshToken };
  //   } catch (error) {
  //     console.error('Token validation error:', error.message);
  //     throw new UnauthorizedException('Token verification failed');
  //   }
  // }

  async validateUser(
    token: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) throw new UnauthorizedException('Invalid token format');

      console.log('Decoded token:', decoded); // Debugging: See token contents

      const kid = decoded?.header.kid;
      if (!kid) {
        throw new UnauthorizedException('Invalid token (no kid found)');
      }

      const publicKey = await this.getKey(kid);

      const verified = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        audience: process.env.AUTH0_AUDIENCE, 
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      }) as any;

      console.log('Verified token:', verified);

      const user = await this.userModel.findOne({ email: verified.email });
      if (user) {
        const refreshToken = await this.generateAndStoreRefreshToken(user);
        const accessToken = this.generateJwtToken(user);
        return { user, accessToken, refreshToken };
      } else {
        console.log('User not found, creating new user');
        const { newUser, newUserRefreshToken } =
          await this.userService.createUser({
            email: verified.email,
            name: verified.name,
            picture: verified.picture,
            verified: verified.email_verified || false,
          });
      const accessToken = this.generateJwtToken(newUser);
      const refreshToken = await this.generateAndStoreRefreshToken(newUser);
      return { user: newUser, accessToken, refreshToken };
    }
    } catch (error) {
      console.error('Token validation error:', error.message);
      throw new UnauthorizedException('Token verification failed');
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
