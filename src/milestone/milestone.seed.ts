import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Milestone,
  MilestoneDocument,
  MilestoneType,
} from './schema/Milestone.schema';

@Injectable()
export class MilestoneSeedService implements OnModuleInit {
  private readonly logger = new Logger(MilestoneSeedService.name);
  constructor(
    @InjectModel(Milestone.name)
    private milestoneModel: Model<MilestoneDocument>,
  ) {}

  async onModuleInit() {
    await this.milestoneModel.deleteMany({});
    this.logger.log('Deleted all existing milestones');

    const defaultMilestones = [
      {
        type: MilestoneType.BIRTHDAY,
        title: 'Birthday Celebration',
        message:
          'Happy Birthday {name}! 🎉 Wishing you a fantastic day filled with joy and celebration.',
        coins: 5,
        isActive: true,
      },
      {
        type: MilestoneType.WORK_ANNIVERSARY,
        title: 'Work Anniversary',
        message:
          'Congratulations {name} on your work anniversary! 🎊 Thank you for your valuable contributions.',
        coins: 5,
        isActive: true,
      },
      {
        type: MilestoneType.INTERNATIONAL_MENS_DAY,
        title: "International Men's Day",
        message:
          "Happy International Men's Day, 🎉 Thank you for your strength, kindness, and contributions.",
        coins: 5,
        isActive: true,
      },
      {
        type: MilestoneType.INTERNATIONAL_WOMENS_DAY,
        title: "International Women's Day",
        message:
          "Happy International Women's Day, 🌟 Thank you for your strength, resilience, and invaluable contributions.",
        coins: 5,
        isActive: true,
      },
      {
        type: MilestoneType.VALENTINE_DAY,
        title: "Happy Valentine's Day",
        message:
          "Happy Valentine's Day Team! 💖 Thank you for your love, support, and dedication.",
        coins: 5,
        isActive: true,
      },
      {
        type: MilestoneType.INTERNATIONAL_EMPLOYEE_APPRECIATION_DAY,
        title: 'International Employee Day',
        message:
          'Happy International Employee Day! 🎉 We appreciate your hard work, dedication, and contributions!',
        coins: 5,
        isActive: true,
      },
    ];

    await this.milestoneModel.insertMany(defaultMilestones);
    this.logger.log(`Inserted ${defaultMilestones.length} default milestones`);
  }
}
