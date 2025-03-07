import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGroupDto, UpdateGroupDto } from './dto/group.dto';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Group } from './schema/group.schema';
import { User } from 'src/users/schema/User.schema';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class GroupsService {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
  ) {}
  async create(createGroupDto: CreateGroupDto) {
    const existingGroup = await this.groupModel
      .findOne({ name: createGroupDto.name })
      .exec();
    if (existingGroup) {
      throw new ConflictException(
        `A group with the name ${createGroupDto.name} already exists.`,
      );
    }

    return await this.groupModel.create({
      name: createGroupDto.name,
      members: createGroupDto.members.map((memberId) => new Types.ObjectId(memberId)),});
  }

  findAll() {
    return this.groupModel.find().exec();
  }

  findByName(name: string) {
    return this.groupModel
      .findOne({ name: { $regex: new RegExp(name, 'i') } })
      .exec();
  }

  async update(id: string, updateGroupDto: UpdateGroupDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid ID format: ${id}`);
    }
    if (updateGroupDto.members && Array.isArray(updateGroupDto.members)) {
      updateGroupDto.members = [...new Set(updateGroupDto.members)].map(
        (id) => new Types.ObjectId(id),
      );
    }
  
    const updatedGroup = await this.groupModel
      .findByIdAndUpdate(new Types.ObjectId(id), updateGroupDto, {
        new: true,
      })
      .exec();

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

  async getGroupMembers(groupIds: string[]): Promise<{ users: User[] }> {
    groupIds.forEach((groupId) => {
      if (!isValidObjectId(groupId)) {
        throw new BadRequestException(`Invalid ID format: ${groupId}`);
      }
    });

    const groups = await this.groupModel
      .find({ _id: { $in: groupIds } })
      .exec();
    if (groups.length === 0) {
      throw new NotFoundException(`No groups found for the given IDs`);
    }

    const memberIds = [...new Set(groups.flatMap((group) => group.members))];

    console.log('Unique Group Members:', memberIds);

    const members = await Promise.all(
      memberIds.map((memberId) =>
        this.usersService.findById(new Types.ObjectId(memberId)),
      ),
    );

    return { users: members.filter((user) => user !== null) };
  }
}
