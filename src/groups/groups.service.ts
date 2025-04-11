import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  Type,
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
    @Inject(forwardRef(() => UsersService))
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
      members: createGroupDto.members.map(
        (memberId) => new Types.ObjectId(memberId),
      ),
    });
  }

  async findGroups(name?: string) {
    const query: any = {};

    if (name) {
      query.name = { $regex: new RegExp(name, 'i') };
    }

    const groups = await this.groupModel.find(query).exec();

    return {
      data: groups,
      total: groups.length,
    };
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

    const members = await Promise.all(
      memberIds.map((memberId) =>
        this.usersService.findById(new Types.ObjectId(memberId)),
      ),
    );

    return { users: members.filter((user) => user !== null) };
  }

  async addMembersToGroup(
    groupId: Types.ObjectId,
    userIds: Types.ObjectId[] | Types.ObjectId,
    session?: any,
  ): Promise<Group> {
    const group = await this.groupModel
      .findById(groupId)
      .session(session)
      .exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const userIdsArray = Array.isArray(userIds) ? userIds : [userIds];

    const newMembers = userIdsArray
      .map((id) => new Types.ObjectId(id))
      .filter((id) => !group.members.some((member) => member.equals(id)));

    if (newMembers.length > 0) {
      group.members.push(...newMembers);
      await group.save({ session });
    }

    return group;
  }
}
