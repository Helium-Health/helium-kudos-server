import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGroupDto, UpdateGroupDto } from './dto/group.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group } from './schema/group.schema';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
  ) {}
  create(createGroupDto: CreateGroupDto) {
    return 'This action adds a new group';
  }

  findAll() {
    return this.groupModel.find().exec();
  }

  findByName(name: string) {
    return this.groupModel
      .findOne({ name: { $regex: new RegExp(name, 'i') } })
      .exec();
  }

  async update(id: Types.ObjectId, updateGroupDto: UpdateGroupDto) {
    const updatedGroup = await this.groupModel.findByIdAndUpdate(
      id,
      updateGroupDto,
      {
        new: true,
      },
    ).exec;

    if (!updatedGroup) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return updatedGroup;
  }

  async remove(id: Types.ObjectId) {
    const result = await this.groupModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    return { message: `Group with ID ${id} has been removed` };
  }

  async getGroupMembers(groupName: string): Promise<string[]> {
    const group = await this.groupModel
      .findOne({ name: { $regex: new RegExp(groupName, 'i') } })
      .exec();

    if (!group) {
      throw new NotFoundException(`Group with name "${groupName}" not found`);
    }

    return group.members.map(member => member.toString()); // Ensure string array
  }
}
