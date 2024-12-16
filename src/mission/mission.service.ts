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
import { UsersService } from 'src/users/users.service';

@Injectable()
export class MissionService {
  constructor(
    @InjectModel(Mission.name) private missionModel: Model<MissionDocument>,
    private userService: UsersService,
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

  async getAllMissions(filter: {
    status?: string;
    page?: number;
    limit?: number;
    upcoming?: boolean;
    startDate?: string;
  }) {
    const { status, page = 1, limit = 10, upcoming, startDate } = filter;
    const query: any = {};
    const now = new Date();

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter for upcoming missions
    if (upcoming) {
      const upcomingStartDate = startDate ? new Date(startDate) : now;
      query.startDate = { $gt: upcomingStartDate };
    }

    const skip = (page - 1) * limit;

    // Fetch missions
    const missions = await this.missionModel
      .find(query)
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Map missions to include detailed participant data
    const detailedMissions = await Promise.all(
      missions.map(async (mission) => {
        // Fetch participants' user details
        const participantIds = mission.participantsPoints.map(
          (p) => p.userId,
        );
        const participants = await Promise.all(
          participantIds.map((id) => this.userService.findById(id)),
        );

        /// Merge participant details with points and rank
        const participantsWithPoints = participants.map((participant) => {
          const pointsEntry = mission.participantsPoints.find(
            (pp) => pp.userId.toString() === participant._id.toString(),
          );

          return {
            name: participant.name,
            email: participant.email,
            picture: participant.picture,
            points: pointsEntry?.points || 0,
            rank: pointsEntry?.rank || 0,
          };
        });

        return {
          ...mission.toObject(),
          participants: participantsWithPoints,
        };
      }),
    );

    // Total count for pagination
    const totalMissions = await this.missionModel.countDocuments(query);

    return {
      missions: detailedMissions,
      total: totalMissions,
      page,
      totalPages: Math.ceil(totalMissions / limit),
    };
  }

  async addParticipant(missionId: string, userId: Types.ObjectId) {
    const mission = await this.missionModel.findById(
      new Types.ObjectId(missionId),
    );

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (
      [MissionStatus.COMPLETED, MissionStatus.CANCELED].includes(mission.status)
    ) {
      throw new BadRequestException('Mission Ended or Canceled');
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
