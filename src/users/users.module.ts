import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schema/User.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { Wallet, WalletSchema } from 'src/wallet/schema/Wallet.schema';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      { name: Wallet.name, schema: WalletSchema },
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
