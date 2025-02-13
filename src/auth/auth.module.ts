import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schema/User.schema';
import { UsersModule } from 'src/users/users.module';
import { GoogleAuthGuard } from './utils/google.guard';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './utils/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { Auth0Strategy } from './utils/auth0.strategy';
import { Auth0AuthGuard } from './utils/auth0.guard';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule.register({ session: true }),
    UsersModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    JwtModule.registerAsync({
      useFactory: async () => {
        return {
          secret: process.env.JWT_SECRET,
          signOptions: {
            expiresIn: '1d',
          },
        };
      },
    }),
  ],
  providers: [
    GoogleAuthGuard,
    JwtStrategy,
    {
      provide: 'AUTH_SERVICE',
      useClass: AuthService,
    },
    Auth0Strategy,
    {
      provide: 'AUTH_GUARD',
      useClass: Auth0AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [
    {
      provide: 'AUTH_SERVICE',
      useClass: AuthService,
    },
  ],
})
export class AuthModule {}
