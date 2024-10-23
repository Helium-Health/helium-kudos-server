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
  TransactionType,
} from 'src/schemas/Transaction.schema';
import { TransactionService } from 'src/transaction/transaction.service';
import { WalletService } from 'src/wallet/wallet.service';
import { Claim, ClaimDocument, Status } from './schema/claim.schema';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ClaimService {
  constructor(
    @InjectModel(Claim.name) private readonly claimModel: Model<ClaimDocument>,
    private transactionService: TransactionService,
    private walletService: WalletService,
  ) {}
  async recordClaim({
    senderId,
    receiverId,
    recognitionId,
    coinAmount,
  }: {
    senderId: Types.ObjectId;
    receiverId: Types.ObjectId;
    recognitionId: Types.ObjectId;
    coinAmount: number;
  }): Promise<ClaimDocument> {
    const claim = new this.claimModel({
      senderId,
      receiverId,
      recognitionId,
      amount: coinAmount,
      status: Status.PENDING,
      approved: false,
    });

    return claim.save();
  }

  async claimCoin(
    {
      senderId,
      receiverIds,
      coinAmount,
      recognitionId,
    }: {
      senderId: Types.ObjectId;
      coinAmount: number;
      receiverIds: string[];
      recognitionId: Types.ObjectId;
    },
    session: ClientSession,
  ) {
    const totalCoinAmount = coinAmount * receiverIds.length;

    await this.walletService.deductCoins(senderId, totalCoinAmount, session);

    for (const receiverId of receiverIds) {
      const claim = await this.recordClaim({
        senderId: new Types.ObjectId(senderId),
        receiverId: new Types.ObjectId(receiverId),
        recognitionId: recognitionId,
        coinAmount: coinAmount,
      });

      await this.transactionService.recordDebitTransaction(
        {
          senderId: new Types.ObjectId(senderId),
          receiverId: new Types.ObjectId(receiverId),
          amount: coinAmount,
          entityId: recognitionId,
          entityType: EntityType.RECOGNITION,
          claimId: claim._id as Types.ObjectId,
        },
        session,
      );
    }
  }

  async getPendingClaims(): Promise<Claim[]> {
    return this.claimModel.find({ status: Status.PENDING }).exec();
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
      claim.approved = true;
      await claim.save({ session });

      await this.walletService.incrementEarnedBalance(
        new Types.ObjectId(claim.receiverId),
        claim.amount,
        session,
      );

      await this.transactionService.recordCreditTransaction(
        {
          senderId: claim.senderId,
          receiverId: claim.receiverId,
          amount: Math.abs(claim.amount),
          entityId: new Types.ObjectId(claim.recognitionId),
          entityType: EntityType.RECOGNITION,
          claimId: claim._id as Types.ObjectId,
        },
        session,
      );

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

      claim.status = Status.REJECTED;
      claim.approved = false;
      await claim.save({ session });

      const debitTransaction =
        await this.transactionService.findTransactionByClaimId(
          claim._id as Types.ObjectId,
          TransactionType.DEBIT,
          session,
        );

      if (!debitTransaction) {
        throw new NotFoundException('Associated debit transaction not found');
      }

      debitTransaction.status = transactionStatus.REVERSED;
      await debitTransaction.save({ session });

      await this.walletService.refundGiveableBalance(
        claim.senderId,
        Math.abs(claim.amount),
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error('Error denying claim:', error);
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
      if (!(status in Status)) {
        throw new BadRequestException(`Invalid status: ${status}`);
      }
      filter.status = status as Status;
    }

    return this.claimModel.find(filter).exec();
  }
}
