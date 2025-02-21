import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
import { RecognitionService } from '../recognition/recognition.service';
import { MilestoneService } from './milestone.service';
import { MilestoneType } from './schema/Milestone.schema';
import { UserGender } from 'src/users/schema/User.schema';

@Injectable()
export class MilestoneCronService {
  constructor(
    private readonly usersService: UsersService,
    private readonly recognitionService: RecognitionService,
    private readonly milestoneService: MilestoneService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleBirthdayRecognitions() {
    const birthdayMilestone = await this.milestoneService.findByType(
      MilestoneType.BIRTHDAY,
    );
    const today = new Date();
    const users = await this.usersService.findUsersByBirthday(
      today.getMonth() + 1,
      today.getDate(),
    );

    for (const user of users) {
      console.log('i was called', user.name);
      await this.recognitionService.createAutoRecognition({
        receiverId: user._id.toString(),
        message: birthdayMilestone.message.replace('{name}', user.name),
        coinAmount: birthdayMilestone.coins,
        milestoneType: MilestoneType.BIRTHDAY,
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleWorkAnniversaryRecognitions() {
    const anniversaryMilestone = await this.milestoneService.findByType(
      MilestoneType.WORK_ANNIVERSARY,
    );
    const today = new Date();
    const users = await this.usersService.findUsersByWorkAnniversary(
      today.getMonth() + 1,
      today.getDate(),
    );

    for (const user of users) {
      await this.recognitionService.createAutoRecognition({
        receiverId: user._id.toString(),
        message: anniversaryMilestone.message.replace('{name}', user.name),
        coinAmount: anniversaryMilestone.coins,
        milestoneType: MilestoneType.WORK_ANNIVERSARY,
      });
    }
  }
  @Cron(CronExpression.EVERY_MINUTE)
  // @Cron('0 0 19 11 *') // Midnight on November 19 (International Men's Day)
  async handleMensDayRecognitions() {
    const mensDayMilestone = await this.milestoneService.findByType(
      MilestoneType.INTERNATIONAL_MENS_DAY,
    );
    const users = await this.usersService.findUsersByGender(UserGender.Male);

    for (const user of users) {
      await this.recognitionService.createAutoRecognition({
        receiverId: user._id.toString(),
        message: mensDayMilestone.message.replace('{name}', user.name),
        coinAmount: mensDayMilestone.coins,
        milestoneType: MilestoneType.INTERNATIONAL_MENS_DAY,
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  // @Cron('0 0 8 3 *') // Midnight on March 8 (International Women's Day)
  async handleWomensDayRecognitions() {
    const womensDayMilestone = await this.milestoneService.findByType(
      MilestoneType.INTERNATIONAL_WOMENS_DAY,
    );
    const users = await this.usersService.findUsersByGender(UserGender.Female);

    for (const user of users) {
      await this.recognitionService.createAutoRecognition({
        receiverId: user._id.toString(),
        message: womensDayMilestone.message.replace('{name}', user.name),
        coinAmount: womensDayMilestone.coins,
        milestoneType: MilestoneType.INTERNATIONAL_WOMENS_DAY,
      });
    }
  }
}
