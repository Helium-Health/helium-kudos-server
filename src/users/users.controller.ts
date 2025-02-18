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

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userSyncService: UserSyncService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    const { newUser } = await this.usersService.createUser(createUserDto);
    return newUser;
  }

  @Post('create-users-from-sheet')
  async createInitialUsers() {
    return await this.userSyncService.createInitialUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async searchUsers(
    @Query('name') name: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('active') active: string,
    @Request() req,
  ) {
    const userId = req.user?.userId;
    return this.usersService.findUsers(name, userId, page, limit, active);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return this.usersService.findByEmail(req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async update(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const allowedUpdates = {
      dateOfBirth: updateUserDto.dateOfBirth,
      joinDate: updateUserDto.joinDate,
      gender: updateUserDto.gender,
    };

    return this.usersService.updateUser(req.user.userId, allowedUpdates);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/role')
  @UseGuards(AdminGuard)
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUser(id, { role: updateUserRoleDto.role });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('deactivate/:userId')
  async deactivateUser(@Param('userId') userId: string) {
    return await this.usersService.deactivateUser(new Types.ObjectId(userId));
  }

  @UseGuards(JwtAuthGuard)
  @Put('activate/:userId')
  async activateUser(@Param('userId') userId: string) {
    return await this.usersService.activateUser(new Types.ObjectId(userId));
  }
}
