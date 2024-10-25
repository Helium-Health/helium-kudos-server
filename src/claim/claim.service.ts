import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientSession, Model, Types } from 'mongoose';
import { EntityType, transactionStatus } from 'src/schemas/Transaction.schema';
import { TransactionService } from 'src/transaction/transaction.service';
import { WalletService } from 'src/wallet/wallet.service';
import { Claim, ClaimDocument, Status } from './schema/claim.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ClaimDto } from './dto/claim.dto';

@Injectable()
export class ClaimService {
  constructor(
    @InjectModel(Claim.name) private readonly claimModel: Model<ClaimDocument>,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
  ) {}
  async recordClaim(
    { senderId, receiverIds, recognitionId, coinAmount }: ClaimDto,
    session: ClientSession,
  ): Promise<ClaimDocument> {
    const claim = new this.claimModel({
      senderId,
      receiverIds,
      recognitionId,
      amount: coinAmount,
      status: Status.PENDING,
      approved: false,
    });

    return claim.save({ session });
  }

  async claimCoin(
    { senderId, receiverIds, coinAmount, recognitionId }: ClaimDto,
    session: ClientSession,
  ) {
    const totalCoinAmount = coinAmount * receiverIds.length;

    await this.walletService.deductCoins(senderId, totalCoinAmount, session);

    const claim = await this.recordClaim(
      {
        senderId: new Types.ObjectId(senderId),
        receiverIds: receiverIds.map((id) => new Types.ObjectId(id)),
        recognitionId: recognitionId,
        coinAmount: coinAmount,
      },
      session,
    );
    for (const receiverId of receiverIds) {
      await this.transactionService.recordDebitTransaction(
        {
          senderId: new Types.ObjectId(senderId),
          receiverId: new Types.ObjectId(receiverId),
          amount: coinAmount,
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

      for (const receiverId of claim.receiverIds) {
        await this.walletService.incrementEarnedBalance(
          new Types.ObjectId(receiverId),
          claim.amount,
          session,
        );

        await this.transactionService.recordCreditTransaction(
          {
            senderId: claim.senderId,
            receiverId: new Types.ObjectId(receiverId),
            amount: Math.abs(claim.amount),
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
      const claim = await this.claimModel.findById(claimId);

      if (!claim) {
        throw new NotFoundException('Claim not found');
      }

      if (claim.status !== Status.PENDING) {
        throw new BadRequestException('Claim is not pending');
      }

      for (const receiverId of claim.receiverIds) {
        await this.transactionService.recordCreditTransaction(
          {
            senderId: claim.senderId,
            receiverId: new Types.ObjectId(receiverId),
            amount: Math.abs(claim.amount),
            entityId: new Types.ObjectId(claim.recognitionId),
            entityType: EntityType.RECOGNITION,
            claimId: claim._id as Types.ObjectId,
            status: transactionStatus.REVERSED,
          },
          session,
        );
      }
      const totalCoinAmount = claim.amount * claim.receiverIds.length;
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
      throw new InternalServerErrorException('Failed to deny the claim');
    } finally {
      session.endSession();
    }
  }

  async filterClaims(
    userId?: Types.ObjectId,
    status?: string,
  ): Promise<Claim[]> {
    const filter: any = {};

    if (userId) {
      filter.$or = [
        { senderId: new Types.ObjectId(userId) },
        { receiverId: new Types.ObjectId(userId) },
      ];
    }

    if (status) {
      if (!Object.values(Status).includes(status as Status)) {
        throw new BadRequestException(`Invalid status: ${status}`);
      }
      filter.status = status as Status;
    }

    return this.claimModel.find(filter).exec();
  }
  async getAllClaims(): Promise<Claim[]> {
    return this.claimModel.find().exec();
  }
}
