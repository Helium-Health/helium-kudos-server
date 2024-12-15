import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  Query,
  // UseGuards
} from '@nestjs/common';
import { MissionService } from './mission.service';
// import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
// import { AdminGuard } from 'src/auth/guards/admin.guard';
import {
  AssignPointsDto,
  CreateMissionDto,
  UpdateMissionDto,
} from './dto/mission.dto';
import { Types } from 'mongoose';

@Controller('mission')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  // @UseGuards(AdminGuard)
  @Post()
  create(@Body() createMissionDto: CreateMissionDto) {
    return this.missionService.create(createMissionDto);
  }

  // @UseGuards(AdminGuard)
  @Patch(':id')
  async updateMission(
    @Param('id') missionId: string,
    @Body() updateMissionDto: UpdateMissionDto,
  ) {
    return await this.missionService.updateMission(missionId, updateMissionDto);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('upcoming')
  async getUpcomingMissions(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
  ) {
    return await this.missionService.getUpcomingMissions({ limit, startDate });
  }

  // @UseGuards(AdminGuard)
  @Patch(':id/join')
  async joinMission(@Param('id') missionId: string, @Request() req: any) {
    const userId = new Types.ObjectId(req.user.userId);
    return await this.missionService.addParticipant(missionId, userId);
  }

  // @UseGuards(AdminGuard)
  @Patch(':missionId/assign-points')
  async assignPointsToParticipants(
    @Param('missionId') missionId: string,
    @Body() assignPointsDto: AssignPointsDto,
  ) {
    return await this.missionService.assignPointsToParticipants(
      new Types.ObjectId(missionId),
      assignPointsDto,
    );
  }
}
