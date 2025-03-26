import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/User.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserSyncService } from './user-sync.service';
import { GoogleSheetsModule } from 'src/google/google-sheets/google-sheets.module';
import { SlackModule } from 'src/slack/slack.module';
import { GroupsModule } from 'src/groups/groups.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => GroupsModule),
    SlackModule,
    WalletModule,
    GoogleSheetsModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  providers: [UsersService, UserSyncService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
