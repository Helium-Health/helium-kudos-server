import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
// import { UsersModule } from 'src/users/users.module';
// import { SessionSerializer } from './utils/Serializer';
import { GoogleAuthGuard } from './utils/Guards';
import { GoogleStrategy } from './utils/GoogleStrategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/typeorm/entities/User';

@Module({
  imports: [
    // UsersModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    GoogleAuthGuard,
    GoogleStrategy,
    // SessionSerializer,
    {
      provide: 'AUTH_SERVICE',
      useClass: AuthService,
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
