import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from '../services/UserService';
import { UserController } from '../controllers/UserController';
import { User, UserSchema } from '../schemas/UserSchema';

@Module({
  imports: [
    // Register the User schema with Mongoose
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController], // Add the User controller
  providers: [UserService], // Add the User service
  exports: [UserService], // Export the User service to be used in other modules
})
export class UserModule {}