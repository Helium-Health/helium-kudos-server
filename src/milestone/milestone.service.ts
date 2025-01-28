import { Injectable } from '@nestjs/common';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { Milestone, MilestoneDocument } from './schema/Milestone.schema';
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
  async getUpcomingCelebrations(limit: number) {
    return await this.usersService.getUpcomingCelebrations(limit);
  }
}
