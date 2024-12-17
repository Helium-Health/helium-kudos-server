import { Module } from '@nestjs/common';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { Mission, MissionSchema } from './schema/mission.schema';

import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([{ name: Mission.name, schema: MissionSchema }]),
  ],
  controllers: [MissionController],
  providers: [MissionService],
})
export class MissionModule {}
