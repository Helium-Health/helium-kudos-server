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
    const existingMilestones = await this.milestoneModel
      .find({}, 'type')
      .lean();
    const existingTypes = new Set(
      existingMilestones.map((milestone) => milestone.type),
    );

    const defaultMilestones = [
      {
        type: MilestoneType.BIRTHDAY,
        title: 'Birthday Celebration',
        message:
          'Happy Birthday {name}! 🎉 Wishing you a fantastic day filled with joy and celebration.',
        coins: 100,
        isActive: true,
      },
      {
        type: MilestoneType.WORK_ANNIVERSARY,
        title: 'Work Anniversary',
        message:
          'Congratulations {name} on your work anniversary! 🎊 Thank you for your valuable contributions.',
        coins: 150,
        isActive: true,
      },
      {
        type: MilestoneType.INTERNATIONAL_MENS_DAY,
        title: "International Men's Day",
        message:
          "Happy International Men's Day, {name}! 🎉 Thank you for your strength, kindness, and contributions.",
        coins: 100,
        isActive: true,
      },
      {
        type: MilestoneType.INTERNATIONAL_WOMENS_DAY,
        title: "International Women's Day",
        message:
          "Happy International Women's Day, {name}! 🌟 Thank you for your strength, resilience, and invaluable contributions.",
        coins: 100,
        isActive: true,
      },
    ];

    const newMilestones = defaultMilestones.filter(
      (milestone) => !existingTypes.has(milestone.type),
    );

    if (newMilestones.length > 0) {
      await this.milestoneModel.insertMany(newMilestones);
      this.logger.log('Added ${missingMilestones.length} new milestones');
    } else {
      this.logger.log('No new milestones to add');
    }
  }
}
