import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  async searchUsers(
    @Query('name') name: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req,
  ): Promise<User[]> {
    const userId = req.user?.userId;
    return await this.usersService.findUsers(name, userId, page, limit);
  }

  @Get('me')
  async getProfile(@Request() req) {
    return this.usersService.findByEmail(req.user.email);
  }

  @Patch('me')
  async update(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User | null> {
    const allowedUpdates = {
      dateOfBirth: updateUserDto.dateOfBirth,
      joinDate: updateUserDto.joinDate,
    };

    return this.usersService.updateUser(req.user.userId, allowedUpdates);
  }

  @Patch(':id/role')
  @UseGuards(AdminGuard)
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUser(id, { role: updateUserRoleDto.role });
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<User | null> {
    return this.usersService.deleteUser(id);
  }
}
