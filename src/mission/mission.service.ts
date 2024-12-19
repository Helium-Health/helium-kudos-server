import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  Mission,
  MissionDocument,
  MissionStatus,
} from './schema/mission.schema';
import {
  AssignPointsDto,
  CreateMissionDto,
  UpdateMissionDto,
  UpdateWinnersDto,
} from './dto/mission.dto';
import { UsersService } from 'src/users/users.service';
import { WalletService } from 'src/wallet/wallet.service';
import { TransactionService } from 'src/transaction/transaction.service';
import {
  EntityType,
  transactionStatus,
} from 'src/transaction/schema/Transaction.schema';

@Injectable()
export class MissionService {
  constructor(
    @InjectModel(Mission.name) private missionModel: Model<MissionDocument>,
    private userService: UsersService,
    private wallerService: WalletService,
    private transactionService: TransactionService,
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
    const skip = (page - 1) * limit;
    const now = new Date();

    const pipeline: any[] = [];

    if (status) {
      pipeline.push({
        $match: { status },
      });
    }

    if (upcoming) {
      const upcomingStartDate = startDate ? new Date(startDate) : now;
      pipeline.push({
        $match: {
          startDate: { $gt: upcomingStartDate },
        },
      });
    }

    pipeline.push({
      $sort: { startDate: 1 },
    });

    pipeline.push({ $skip: skip }, { $limit: limit });

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'participants.participantId',
        foreignField: '_id',
        as: 'participantDetails',
      },
    });

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'winners.winnerId',
        foreignField: '_id',
        as: 'winnerDetails',
      },
    });

    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        startDate: 1,
        endDate: 1,
        status: 1,
        participants: {
          $map: {
            input: '$participants',
            as: 'participant',
            in: {
              participantId: '$$participant.participantId',
              points: '$$participant.points',
              rank: '$$participant.rank',
              details: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$participantDetails',
                      as: 'user',
                      cond: {
                        $eq: ['$$user._id', '$$participant.participantId'],
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
        winners: {
          $map: {
            input: '$winners',
            as: 'winner',
            in: {
              winnerId: '$$winner.winnerId',
              points: '$$winner.points',
              coinAmount: '$$winner.coinAmount',
              rank: '$$winner.rank',
              details: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$winnerDetails',
                      as: 'user',
                      cond: {
                        $eq: ['$$user._id', '$$winner.winnerId'],
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
    });

    const missions = await this.missionModel.aggregate(pipeline);

    const totalMissions = await this.missionModel.countDocuments(
      pipeline.length > 0 && pipeline[0].$match ? pipeline[0].$match : {},
    );

    return {
      missions,
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
      throw new BadRequestException('Mission has ended or been canceled');
    }

    if (mission.participants.length >= mission.maxParticipants) {
      throw new BadRequestException('Mission participant limit reached');
    }

    const isParticipant = mission.participants.some(
      (participant) =>
        participant.participantId.toString() === userId.toString(),
    );

    if (isParticipant) {
      throw new BadRequestException(
        'User is already a participant in this mission',
      );
    }

    mission.participants.push({
      participantId: new Types.ObjectId(userId),
      points: 0,
      rank: mission.participants.length + 1,
    });

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

    const participantIds = mission.participants.map((p) =>
      p.participantId.toString(),
    );

    assignPointsDto.participants.forEach(({ userId }) => {
      if (!participantIds.includes(userId.toString())) {
        throw new BadRequestException(
          `User ${userId} is not a participant in this mission`,
        );
      }
    });

    const updatedParticipants = mission.participants.map((participant) => {
      const updatedInfo = assignPointsDto.participants.find(
        (p) => p.userId.toString() === participant.participantId.toString(),
      );

      return updatedInfo
        ? {
            participantId: participant.participantId,
            points: updatedInfo.points,
            rank: 0,
          }
        : participant;
    });

    updatedParticipants.sort((a, b) => b.points - a.points);
    updatedParticipants.forEach((participant, index) => {
      participant.rank = index + 1;
    });

    mission.participants = updatedParticipants;
    await mission.save();

    return {
      message: 'Points assigned and ranks updated successfully',
      participants: updatedParticipants,
    };
  }

  async getMissionParticipants(missionId: Types.ObjectId) {
    const pipeline = [
      { $match: { _id: missionId } },
      { $unwind: '$participants' },
      {
        $lookup: {
          from: 'users',
          localField: 'participants.participantId',
          foreignField: '_id',
          as: 'participantDetails',
        },
      },
      {
        $unwind: {
          path: '$participantDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          userId: '$participants.participantId',
          points: '$participants.points',
          rank: '$participants.rank',
          name: '$participantDetails.name',
          email: '$participantDetails.email',
        },
      },
    ];

    const participants = await this.missionModel.aggregate(pipeline);

    if (!participants || participants.length === 0) {
      throw new Error('Mission not found or no participants available');
    }

    return participants;
  }

  async updateWinners(
    missionId: Types.ObjectId,
    updateWinnersDto: UpdateWinnersDto,
    session: ClientSession,
  ) {
    const { winners } = updateWinnersDto;

    const rankedWinners = winners
      .sort((a, b) => b.points - a.points)
      .map((winner, index) => ({
        ...winner,
        rank: index + 1,
      }));

    const mission = await this.missionModel.findByIdAndUpdate(
      missionId,
      {
        $set: { winners: rankedWinners },
      },
      { new: true },
    );

    if (!mission) {
      throw new Error('Mission not found');
    }

    for (const winner of rankedWinners) {
      await this.wallerService.incrementEarnedBalance(
        new Types.ObjectId(winner.winnerId),
        winner.coinAmount,
        session,
      );

      await this.transactionService.recordCreditTransaction(
        {
          receiverId: new Types.ObjectId(winner.winnerId),
          amount: winner.coinAmount,
          entityType: EntityType.MISSION,
          entityId: missionId,
          senderId: new Types.ObjectId(winner.winnerId),
          status: transactionStatus.SUCCESS,
          claimId: missionId,
        },
        session,
      );
    }

    if (mission.status !== MissionStatus.COMPLETED) {
      mission.status = MissionStatus.COMPLETED;
      await mission.save({ session });
    }

    return mission;
  }
}
