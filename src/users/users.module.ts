import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/User.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { DepartmentModule } from 'src/department/department.module';
@Module({
  imports: [
    WalletModule,
    DepartmentModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
