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
  AssignDepartmentDto,
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
  ) {
    const userId = req.user?.userId;
    return this.usersService.findUsers(name, userId, page, limit);
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

  @Patch(':id/role')
  @UseGuards(AdminGuard)
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

  @Patch('assign-department')
  async assignToDepartment(
    @Body() assignDepartmentDto: AssignDepartmentDto,
  ): Promise<void> {
    const { userIds, departmentId } = assignDepartmentDto;
    await this.usersService.assignToDepartment(userIds, departmentId);
  }

  @Get('no-department')
  async findUsersWithoutDepartment(): Promise<User[]> {
    return this.usersService.findUsersWithoutDepartment();
  }

  @Get('department/:departmentId')
  async findUsersByDepartment(@Param('departmentId') departmentId: string): Promise<User[]> {
    return this.usersService.findUsersByDepartment(departmentId);
  }
}
