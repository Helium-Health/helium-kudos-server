import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserRoleDto,
} from './dto/User.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { User } from './schema/User.schema';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { UserSyncService } from './user-sync.service';
import { Types } from 'mongoose';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userSyncService: UserSyncService,
  ) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    const { newUser } = await this.usersService.createUser(createUserDto);
    return newUser;
  }

  @Post('create-users-from-sheet')
  async createInitialUsers() {
    return await this.userSyncService.createInitialUsers();
  }

  @Post('sync-users-with-sheet')
  async syncUsersWithGoogleSheet() {
    return await this.userSyncService.syncUsersWithGoogleSheet();
  }

  @Get()
  async searchUsers(
    @Query('name') name: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('active') active: boolean,
    @Request() req,
  ) {
    const userId = req.user?.userId;
    return this.usersService.findUsers(name, userId, page, limit, active);
  }

  @Get('me')
  async getProfile(@Request() req) {
    return this.usersService.findByEmail(req.user.email);
  }

  @Patch('me')
  async update(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const allowedUpdates = {
      dateOfBirth: updateUserDto.dateOfBirth,
      joinDate: updateUserDto.joinDate,
      gender: updateUserDto.gender,
    };

    return this.usersService.updateUser(req.user.userId, allowedUpdates);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUser(id, { role: updateUserRoleDto.role });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @UseGuards(AdminGuard)
  @Put('activate/')
  async activateUser(
    @Query('userId') userId: string,
    @Query('active') active: boolean,
  ) {
    return await this.usersService.activateUser(
      new Types.ObjectId(userId),
      active,
    );
  }

  @Post('merge-duplicate-emails')
  async mergeDuplicateEmails() {
    return this.usersService.mergeDuplicateEmails();
  }

  @Post('revert-duplicate-email-merge')
  async revertDuplicateEmailMerge() {
    return this.usersService.revertDuplicateEmailMerge();
  }
}
