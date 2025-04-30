import { Module } from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { MilestoneController } from './milestone.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Milestone, MilestoneSchema } from './schema/Milestone.schema';
import { ScheduleModule } from '@nestjs/schedule';
import { MilestoneCronService } from './milestone.cron.service';
import { MilestoneSeedService } from './milestone.seed';
import { UsersModule } from 'src/users/users.module';
import { RecognitionModule } from 'src/recognition/recognition.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Milestone.name, schema: MilestoneSchema },
    ]),
    UsersModule,
    RecognitionModule,
  ],
  exports: [MilestoneService],

  controllers: [MilestoneController],
  providers: [MilestoneService, MilestoneSeedService, MilestoneCronService],
})
export class MilestoneModule {}
