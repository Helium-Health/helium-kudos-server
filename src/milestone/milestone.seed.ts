import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Milestone,
  MilestoneDocument,
  MilestoneType,
} from './schema/Milestone.schema';

@Injectable()
export class MilestoneSeedService implements OnModuleInit {
  constructor(
    @InjectModel(Milestone.name)
    private milestoneModel: Model<MilestoneDocument>,
  ) {}

  async onModuleInit() {
    const milestonesCount = await this.milestoneModel.countDocuments();

    if (milestonesCount === 0) {
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
      ];

      await this.milestoneModel.insertMany(defaultMilestones);
    }
  }
}
