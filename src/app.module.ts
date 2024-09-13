import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';
import { UserModule } from './modules/UserModule';
dotenv.config();

@Module({
  imports: [MongooseModule.forRoot(process.env.MONGODB_URI),
    UserModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
