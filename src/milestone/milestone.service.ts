import { Injectable } from '@nestjs/common';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import {
  Milestone,
  MilestoneDocument,
  MilestoneType,
} from './schema/Milestone.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class MilestoneService {
  constructor(
    @InjectModel(Milestone.name)
    private milestoneModel: Model<MilestoneDocument>,
    private usersService: UsersService,
  ) {}

  async create(createMilestoneDto: CreateMilestoneDto): Promise<Milestone> {
    const newMilestone = new this.milestoneModel({
      isActive: true,
      title: createMilestoneDto.title,
      message: createMilestoneDto.message,
      coins: createMilestoneDto.coins,
      type: createMilestoneDto.type,
    });
    return newMilestone.save();
  }

  async findAll(): Promise<Milestone[]> {
    return this.milestoneModel.find().exec();
  }

  async findByType(type: string): Promise<Milestone> {
    return this.milestoneModel.findOne({ type }).exec();
  }

  async update(
    milestoneId: string,
    updateMilestoneDto: UpdateMilestoneDto,
  ): Promise<Milestone> {
    return this.milestoneModel
      .findByIdAndUpdate(new Types.ObjectId(milestoneId), updateMilestoneDto, {
        new: true,
      })
      .exec();
  }
  async getUpcomingCelebrations(
    limit: number,
    page: number,
    month?: number,
    celebrationType?: MilestoneType,
  ) {
    return await this.usersService.getUpcomingCelebrations(
      limit,
      page,
      month,
      celebrationType,
    );
  }

  async getMilestoneIdsWithCadence(): Promise<string[]> {
    const milestones = await this.milestoneModel.find(
      { cadence: { $exists: true, $ne: null } },
      { _id: 1 },
    );

    return milestones.map((milestone) => milestone._id.toString());
  }

  async findMilestoneById(id: string): Promise<MilestoneDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid ID format');
    }
    return this.milestoneModel.findById(id).exec();
  }
}
