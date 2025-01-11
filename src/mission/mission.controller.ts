import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { MissionService } from './mission.service';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import {
  AssignPointsDto,
  CreateMissionDto,
  UpdateMissionDto,
  UpdateWinnersDto,
} from './dto/mission.dto';
import { Types } from 'mongoose';

@Controller('mission')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  // @UseGuards(AdminGuard)
  @Post()
  create(@Body() createMissionDto: CreateMissionDto, @Request() req: any) {
    const userId = new Types.ObjectId(req.user.userId);
    return this.missionService.create(createMissionDto, userId);
  }

  // @UseGuards(AdminGuard)
  @Patch(':id')
  async updateMission(
    @Param('id') missionId: string,
    @Body() updateMissionDto: UpdateMissionDto,
  ) {
    return await this.missionService.updateMission(missionId, updateMissionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/join')
  async joinMission(@Param('id') missionId: string, @Request() req: any) {
    const userId = new Types.ObjectId(req.user.userId);
    return await this.missionService.addParticipant(missionId, userId);
  }

  @UseGuards(
    JwtAuthGuard,
    // AdminGuard
  )
  @Get()
  async getAllMissions(
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('upcoming') upcoming?: boolean,
    @Query('startDate') startDate?: string,
  ) {
    return await this.missionService.getAllMissions({
      status,
      page,
      limit,
      upcoming,
      startDate,
    });
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

  // @UseGuards(AdminGuard)
  @Get(':id/participants')
  async getMissionParticipants(@Param('id') missionId: string) {
    return await this.missionService.getMissionParticipants(
      new Types.ObjectId(missionId),
    );
  }

  // @UseGuards(AdminGuard)
  @Patch(':missionId/winners')
  async updateMissionWinners(
    @Param('missionId') missionId: string,
    @Body() updateWinnersDto: UpdateWinnersDto,
  ) {
    return await this.missionService.updateWinners(
      new Types.ObjectId(missionId),
      updateWinnersDto,
    );
  }

  // @UseGuards(AdminGuard)
  @Delete(':id')
  async deleteMission(@Param('id') missionId: string) {
    return await this.missionService.deleteMission(
      new Types.ObjectId(missionId),
    );
  }
}
