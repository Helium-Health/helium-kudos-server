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
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/group.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(createGroupDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':name?')
  async find(@Param('name') name?: string) {
    if (name) {
      return this.groupsService.findByName(name);
    }
    return this.groupsService.findAll();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.update(new Types.ObjectId(+id), updateGroupDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(new Types.ObjectId(+id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('members')
  async getMembers(@Query('name') name: string) {
    if (!name) {
      throw new BadRequestException('Group name is required');
    }
    return this.groupsService.getGroupMembers(name);
  }
}
