import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Milestone,
  MilestoneDocument,
  MilestoneType,
} from './schema/Milestone.schema';
import { Cadence } from 'src/constants';

@Injectable()
export class MilestoneSeedService implements OnModuleInit {
  private readonly logger = new Logger(MilestoneSeedService.name);
  constructor(
    @InjectModel(Milestone.name)
    private milestoneModel: Model<MilestoneDocument>,
  ) {}

  getFirstFridayOfMarch(year: number): Date {
    let date = new Date(year, 2, 1); // March 1st
    while (date.getDay() !== 5) {
      date.setDate(date.getDate() + 1); // Move forward until it's Friday
    }
    return date;
  }

  async onModuleInit() {
    const currentYear = new Date().getFullYear();

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
        isGeneric: true,
        milestoneDate: new Date(currentYear, 10, 19),
      },
      {
        type: MilestoneType.INTERNATIONAL_WOMENS_DAY,
        title: "International Women's Day",
        message:
          "Happy International Women's Day, 🌟 Thank you for your strength, resilience, and invaluable contributions.",
        coins: 5,
        isActive: true,
        isGeneric: true,
        milestoneDate: new Date(currentYear, 2, 8),
      },
      {
        type: MilestoneType.VALENTINE_DAY,
        title: "Happy Valentine's Day",
        message:
          "Happy Valentine's Day Team! 💖 Thank you for your love, support, and dedication.",
        coins: 5,
        isActive: true,
        isGeneric: true,
        milestoneDate: new Date(currentYear, 1, 14),
      },
      {
        type: MilestoneType.INTERNATIONAL_EMPLOYEE_APPRECIATION_DAY,
        title: 'International Employee Day',
        message:
          'Happy International Employee Day! 🎉 We appreciate your hard work, dedication, and contributions!',
        coins: 5,
        isActive: true,
        isGeneric: true,
        milestoneDate: this.getFirstFridayOfMarch(currentYear),
      },
      {
        type: MilestoneType.MONTHLY_ALLOCATION,
        title: 'Employee Monthly Allocation',
        message:
          'Happy New Month! 🎉 You have received your monthly allocation of coins.',
        coins: 5,
        isActive: true,
        isGeneric: true,
        cadence: Cadence.MONTHLY,
      },
    ];

    const operations = defaultMilestones.map((milestone) => ({
      updateOne: {
        filter: { type: milestone.type },
        update: { $setOnInsert: milestone },
        upsert: true,
      },
    }));

    const result = await this.milestoneModel.bulkWrite(operations);

    const insertedCount = result.upsertedCount ?? 0;
    this.logger.log(
      `Milestone seeding complete. ${insertedCount} new milestones added.`,
    );
  }
}
