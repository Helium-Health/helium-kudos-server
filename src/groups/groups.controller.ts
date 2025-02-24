import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/group.dto';
import { Types } from 'mongoose';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(createGroupDto);
  }

  @Get(':name?')
  async find(@Param('name') name?: string) {
    if (name) {
      return this.groupsService.findByName(name);
    }
    return this.groupsService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.update(new Types.ObjectId(+id), updateGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(new Types.ObjectId(+id));
  }

  @Get('members')
  async getMembers(@Query('name') name: string) {
    if (!name) {
      throw new BadRequestException('Group name is required');
    }
    return this.groupsService.getGroupMembers(name);
  }
}
