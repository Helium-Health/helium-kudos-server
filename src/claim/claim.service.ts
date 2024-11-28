import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientSession, Model, Types } from 'mongoose';
import {
  EntityType,
  transactionStatus,
} from 'src/transaction/schema/Transaction.schema';
import { TransactionService } from 'src/transaction/transaction.service';
import { WalletService } from 'src/wallet/wallet.service';
import { Claim, ClaimDocument, Status } from './schema/claim.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ClaimDto } from './dto/claim.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ClaimService {
  constructor(
    @InjectModel(Claim.name) private readonly claimModel: Model<ClaimDocument>,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
    private readonly userService: UsersService,
  ) {}
  async recordClaim(
    { senderId, receivers, recognitionId }: ClaimDto,
    session: ClientSession,
  ): Promise<ClaimDocument> {
    const formattedReceivers = receivers.map((receiver) => ({
      receiverId: receiver.receiverId,
      amount: receiver.amount,
    }));

    const claim = new this.claimModel({
      senderId,
      receivers: formattedReceivers,
      recognitionId,
      status: Status.PENDING,
    });

    return claim.save({ session });
  }

  async claimCoin(
    { senderId, receivers, recognitionId }: ClaimDto,
    session: ClientSession,
  ) {
    const totalCoinAmount = receivers.reduce(
      (sum, receiver) => sum + receiver.amount,
      0,
    );

    await this.walletService.deductCoins(senderId, totalCoinAmount, session);

    const claim = await this.recordClaim(
      {
        senderId: new Types.ObjectId(senderId),
        receivers: receivers.map((receiver) => ({
          receiverId: new Types.ObjectId(receiver.receiverId),
          amount: receiver.amount,
        })),
        recognitionId: recognitionId,
      },
      session,
    );

    for (const receiver of receivers) {
      await this.transactionService.recordDebitTransaction(
        {
          senderId: new Types.ObjectId(senderId),
          receiverId: new Types.ObjectId(receiver.receiverId),
          amount: receiver.amount,
          entityId: recognitionId,
          entityType: EntityType.RECOGNITION,
          claimId: claim._id as Types.ObjectId,
          status: transactionStatus.SUCCESS,
        },
        session,
      );
    }
  }

  async approveClaim(claimId: Types.ObjectId) {
    const session = await this.claimModel.db.startSession();
    session.startTransaction();

    try {
      const claim = await this.claimModel
        .findById(new Types.ObjectId(claimId))
        .session(session);

      if (!claim) {
        throw new NotFoundException('Claim not found');
      }

      if (claim.status !== Status.PENDING) {
        throw new BadRequestException('Claim is not pending');
      }

      claim.status = Status.APPROVED;
      await claim.save({ session });

      for (const receiver of claim.receivers) {
        const { receiverId, amount } = receiver;

        await this.walletService.incrementEarnedBalance(
          new Types.ObjectId(receiverId),
          amount,
          session,
        );

        await this.transactionService.recordCreditTransaction(
          {
            senderId: claim.senderId,
            receiverId: new Types.ObjectId(receiverId),
            amount: Math.abs(amount),
            entityId: new Types.ObjectId(claim.recognitionId),
            entityType: EntityType.RECOGNITION,
            claimId: claim._id as Types.ObjectId,
            status: transactionStatus.SUCCESS,
          },
          session,
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error('Error approving claim:', error);
      throw new InternalServerErrorException('Failed to approve the claim');
    } finally {
      session.endSession();
    }
  }

  async rejectClaim(claimId: Types.ObjectId) {
    const session = await this.claimModel.db.startSession();
    session.startTransaction();

    try {
      const claim = await this.claimModel.findById(claimId).session(session);

      if (!claim) {
        throw new NotFoundException('Claim not found');
      }

      if (claim.status !== Status.PENDING) {
        throw new BadRequestException('Claim is not pending');
      }

      for (const receiver of claim.receivers) {
        const { receiverId, amount } = receiver;

        await this.transactionService.recordCreditTransaction(
          {
            senderId: claim.senderId,
            receiverId: new Types.ObjectId(receiverId),
            amount: Math.abs(amount),
            entityId: new Types.ObjectId(claim.recognitionId),
            entityType: EntityType.RECOGNITION,
            claimId: claim._id as Types.ObjectId,
            status: transactionStatus.REVERSED,
          },
          session,
        );
      }

      const totalCoinAmount = claim.receivers.reduce(
        (sum, receiver) => sum + receiver.amount,
        0,
      );

      await this.walletService.refundGiveableBalance(
        claim.senderId,
        totalCoinAmount,
        session,
      );

      claim.status = Status.REJECTED;
      await claim.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error('Error rejecting claim:', error);
      throw new InternalServerErrorException('Failed to reject the claim');
    } finally {
      session.endSession();
    }
  }

  async filterClaims(
    userId?: Types.ObjectId,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const filter: any = {};
    const currentPage = page ?? 1;
    const currentLimit = limit ?? 10;

    if (userId) {
      filter.$or = [
        { senderId: new Types.ObjectId(userId) },
        { 'receivers.receiverId': new Types.ObjectId(userId) },
      ];
    }

    if (status) {
      if (!Object.values(Status).includes(status as Status)) {
        throw new BadRequestException(`Invalid status: ${status}`);
      }
      filter.status = status as Status;
    }

    const claims = await this.claimModel
      .find(filter)
      .skip((currentPage - 1) * currentLimit)
      .limit(currentLimit)
      .exec();

    const claimsWithUserDetails = await Promise.all(
      claims.map(async (claim) => {
        const senderDetails = await this.userService.findById(claim.senderId);

        const receiverDetails = await Promise.all(
          claim.receivers.map(async (receiver) => {
            const receiverUser = await this.userService.findById(
              receiver.receiverId,
            );
            return {
              _id: receiver.receiverId,
              name: receiverUser?.name,
              picture: receiverUser?.picture,
              amount: receiver.amount,
            };
          }),
        );

        return {
          ...claim.toObject(),
          senderId: {
            _id: claim.senderId,
            name: senderDetails?.name,
            picture: senderDetails?.picture,
          },
          receivers: receiverDetails,
        };
      }),
    );

    return claimsWithUserDetails;
  }
}
