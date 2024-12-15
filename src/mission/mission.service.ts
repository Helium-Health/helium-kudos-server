import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Mission,
  MissionDocument,
  MissionStatus,
} from './schema/mission.schema';
import {
  AssignPointsDto,
  CreateMissionDto,
  UpdateMissionDto,
} from './dto/mission.dto';

@Injectable()
export class MissionService {
  constructor(
    @InjectModel(Mission.name) private missionModel: Model<MissionDocument>,
  ) {}
  create(createMissionDto: CreateMissionDto) {
    const mission = new this.missionModel({
      ...createMissionDto,
      startDate: new Date(createMissionDto.startDate),
      endDate: new Date(createMissionDto.startDate),
    });
    return mission.save();
  }

  async updateMission(missionId: string, updateMissionDto: UpdateMissionDto) {
    const mission = await this.missionModel.findById(missionId);

    if (!mission) {
      throw new NotFoundException(`Mission with ID ${missionId} not found`);
    }

    if (updateMissionDto.pointValue !== undefined) {
      mission.pointValue = updateMissionDto.pointValue;
    }
    if (updateMissionDto.maxParticipants !== undefined) {
      mission.maxParticipants = updateMissionDto.maxParticipants;
    }
    if (updateMissionDto.endDate !== undefined) {
      mission.endDate = new Date(updateMissionDto.endDate);
    }
    if (updateMissionDto.status !== undefined) {
      if (
        Object.values(MissionStatus).includes(
          updateMissionDto.status as MissionStatus,
        )
      ) {
        mission.status = updateMissionDto.status as MissionStatus;
      } else {
        throw new BadRequestException(
          `Invalid status: ${updateMissionDto.status}`,
        );
      }
    }

    await mission.save();

    return mission;
  }

  async getUpcomingMissions(filter: { limit?: number; startDate?: string }) {
    const now = new Date();

    const startDate = filter.startDate ? new Date(filter.startDate) : now;
    const limit = filter.limit || 10;

    const query: any = {
      startDate: { $gt: startDate },
    };

    const missions = this.missionModel
      .find(query)
      .sort({ startDate: 1 })
      .limit(limit);

    return await missions;
  }

  async addParticipant(missionId: string, userId: Types.ObjectId) {
    const mission = await this.missionModel.findById(
      new Types.ObjectId(missionId),
    );

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.participantsId.length >= mission.maxParticipants) {
      throw new BadRequestException('Mission participant limit reached');
    }

    if (mission.participantsId.includes(new Types.ObjectId(userId))) {
      throw new BadRequestException(
        'User is already a participant in this mission',
      );
    }

    mission.participantsId.push(new Types.ObjectId(userId));
    await mission.save();

    return { message: 'User successfully joined the mission', mission };
  }

  async assignPointsToParticipants(
    missionId: Types.ObjectId,
    assignPointsDto: AssignPointsDto,
  ) {
    const mission = await this.missionModel.findById(
      new Types.ObjectId(missionId),
    );

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const participantIds = mission.participantsId.map((id) => id.toString());
    assignPointsDto.participants.forEach(({ userId }) => {
      if (!participantIds.includes(userId)) {
        throw new BadRequestException(
          `User ${userId} is not a participant in this mission`,
        );
      }
    });

    const participantPoints = assignPointsDto.participants.map(
      ({ userId, points }) => ({
        userId: new Types.ObjectId(userId),
        points,
      }),
    );

    // Sort participants by points in descending order to determine ranks
    participantPoints.sort((a, b) => b.points - a.points);

    // Update mission with points and ranks
    const updatedParticipants = participantPoints.map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));

    mission.participantsPoints = updatedParticipants;
    await mission.save();

    return {
      message: 'Points assigned and ranks updated successfully',
      participants: updatedParticipants,
    };
  }
}
