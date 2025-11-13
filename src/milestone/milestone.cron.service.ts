import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
import { RecognitionService } from '../recognition/recognition.service';
import { MilestoneService } from './milestone.service';
import { MilestoneType } from './schema/Milestone.schema';
import { UserGender } from 'src/users/schema/User.schema';
import { Types } from 'mongoose';
import {
  CRON_EVERY_DAY_AT_HALF_PAST_MIDNIGHT,
  CRON_EVERY_DAY_AT_QUARTER_PAST_MIDNIGHT,
  CRON_EVERY_MARCH_8_0020,
  CRON_EVERY_YEAR_ON_NOV_13_AT_0020,
  CRON_EVERY_YEAR_ON_NOVEMBER_19_AT_0020,
} from 'src/constants/index';

@Injectable()
export class MilestoneCronService {
  constructor(
    private readonly usersService: UsersService,
    private readonly recognitionService: RecognitionService,
    private readonly milestoneService: MilestoneService,
  ) {}

  @Cron(CRON_EVERY_DAY_AT_QUARTER_PAST_MIDNIGHT)
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
        receiverId: [{ receiverId: user._id as Types.ObjectId }],
        message: birthdayMilestone.message.replace('{name}', user.name),
        coinAmount: birthdayMilestone.coins,
        milestoneType: MilestoneType.BIRTHDAY,
      });
    }
  }

  @Cron(CRON_EVERY_DAY_AT_HALF_PAST_MIDNIGHT)
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
        receiverId: [{ receiverId: user._id as Types.ObjectId }],
        message: anniversaryMilestone.message.replace('{name}', user.name),
        coinAmount: anniversaryMilestone.coins,
        milestoneType: MilestoneType.WORK_ANNIVERSARY,
      });
    }
  }

  @Cron(CRON_EVERY_YEAR_ON_NOVEMBER_19_AT_0020) // Midnight on November 19 (International Men's Day)
  async handleMensDayRecognitions() {
    const mensDayMilestone = await this.milestoneService.findByType(
      MilestoneType.INTERNATIONAL_MENS_DAY,
    );
    const users = await this.usersService.findUsersByGender(UserGender.Male);
    const receivers = users.map((user) => ({
      receiverId: user._id as Types.ObjectId,
    }));

    if (receivers.length > 0) {
      await this.recognitionService.createAutoRecognition({
        receiverId: receivers,
        message: mensDayMilestone.message,
        coinAmount: mensDayMilestone.coins,
        milestoneType: MilestoneType.INTERNATIONAL_MENS_DAY,
      });
    }
  }

  @Cron(CRON_EVERY_YEAR_ON_NOV_13_AT_0020) // Daytime on November 13 (Test Celebration)
  async handleTestCelebrationRecognitions() {
    const testCelebrationMilestone = await this.milestoneService.findByType(
      MilestoneType.TEST_CELEBRATION,
    );
    const users = await this.usersService.findUsersByGender(UserGender.Male);

    console.log('Testing celebration for user');
    const receivers = users.map((user) => ({
      receiverId: user._id as Types.ObjectId,
    }));

    if (receivers.length > 0) {
      await this.recognitionService.createAutoRecognition({
        receiverId: receivers,
        message: testCelebrationMilestone.message,
        coinAmount: testCelebrationMilestone.coins,
        milestoneType: MilestoneType.TEST_CELEBRATION,
      });
    }
  }

  @Cron(CRON_EVERY_MARCH_8_0020) // Midnight on March 8 (International Women's Day)
  async handleWomensDayRecognitions() {
    const womensDayMilestone = await this.milestoneService.findByType(
      MilestoneType.INTERNATIONAL_WOMENS_DAY,
    );

    const users = await this.usersService.findUsersByGender(UserGender.Female);
    const receivers = users.map((user) => ({
      receiverId: user._id as Types.ObjectId,
    }));

    if (receivers.length > 0) {
      await this.recognitionService.createAutoRecognition({
        receiverId: receivers,
        message: womensDayMilestone.message,
        coinAmount: womensDayMilestone.coins,
        milestoneType: MilestoneType.INTERNATIONAL_WOMENS_DAY,
      });
    }
  }

  private static readonly cronExpression: string =
    process.env.NODE_ENV === 'development'
      ? '0 15 5 3 *' //5:15 AM on March 5th
      : '0 8 7 3 *'; // 8:00 AM on March 7th

  @Cron(MilestoneCronService.cronExpression)
  async handleEmployeeAppreciationDayRecognitions() {
    const employeeDayMilestone = await this.milestoneService.findByType(
      MilestoneType.INTERNATIONAL_EMPLOYEE_APPRECIATION_DAY,
    );

    const users = await this.usersService.getAllUsers();
    const receivers = users.map((user) => ({
      receiverId: user._id as Types.ObjectId,
    }));

    if (receivers.length > 0) {
      await this.recognitionService.createAutoRecognition({
        receiverId: receivers,
        message: employeeDayMilestone.message,
        coinAmount: employeeDayMilestone.coins,
        milestoneType: MilestoneType.INTERNATIONAL_EMPLOYEE_APPRECIATION_DAY,
      });
    }
  }
}
