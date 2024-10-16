import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  EntityType,
  Status,
  Transaction,
  TransactionType,
} from 'src/schemas/Transaction.schema';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    private walletService: WalletService,
  ) {}

  async recordDebitTransaction(
    transaction: {
      senderId: Types.ObjectId;
      receiverId: Types.ObjectId;
      amount: number;
      entityId: Types.ObjectId;
      entityType: EntityType;
    },
    session: ClientSession,
  ): Promise<Types.ObjectId> {
    const debitTransaction = new this.transactionModel({
      userId: transaction.senderId,
      amount: -transaction.amount,
      type: TransactionType.DEBIT,
      entityType: transaction.entityType,
      entityId: transaction.entityId,
      relatedUserId: transaction.receiverId,
      status: Status.PENDING,
      approved: false,
    });

    const savedTransaction = await debitTransaction.save({ session });

    return savedTransaction._id;
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return this.transactionModel.find({ status: Status.PENDING }).exec();
  }

  async approveTransaction(debitTransactionId: Types.ObjectId) {
    const session = await this.transactionModel.db.startSession();
    session.startTransaction();

    try {
      const debitTransaction = await this.transactionModel
        .findById(debitTransactionId)
        .session(session);

      if (!debitTransaction) {
        throw new NotFoundException('Debit transaction not found');
      }

      if (debitTransaction.status !== Status.PENDING) {
        throw new BadRequestException('Transaction is not pending');
      }

      debitTransaction.approved = true;
      await debitTransaction.save({ session });

      await this.recordCreditTransaction(
        debitTransactionId,
        {
          senderId: debitTransaction.userId,
          receiverId: debitTransaction.relatedUserId,
          amount: Math.abs(debitTransaction.amount),
          entityId: debitTransaction.entityId,
          entityType: debitTransaction.entityType,
        },
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error('Error approving transaction:', error);
      throw new InternalServerErrorException(
        'Failed to approve the transaction',
      );
    } finally {
      session.endSession();
    }
  }

  async recordCreditTransaction(
    transactionId: Types.ObjectId,
    transaction: {
      senderId: Types.ObjectId;
      receiverId: Types.ObjectId;
      amount: number;
      entityId: Types.ObjectId;
      entityType: EntityType;
    },
    session: ClientSession,
  ) {
    const debitTransaction = await this.transactionModel
      .findById(transactionId)
      .session(session);

    if (!debitTransaction) {
      throw new NotFoundException('Debit transaction not found');
    }

    if (!debitTransaction.approved) {
      throw new BadRequestException('Transaction is not approved for credit');
    }

    try {
      await this.walletService.incrementEarnedBalance(
        transaction.receiverId,
        transaction.amount,
        session,
      );

      const creditTransaction = new this.transactionModel({
        userId: transaction.receiverId,
        amount: transaction.amount,
        type: TransactionType.CREDIT,
        entityType: transaction.entityType,
        entityId: transaction.entityId,
        relatedUserId: transaction.senderId,
        status: Status.SUCCESS,
        approved: true,
      });

      await creditTransaction.save({ session });

      // Update the debit transaction status to "SUCCESS"
      debitTransaction.status = Status.SUCCESS;
      await debitTransaction.save({ session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error('Error processing credit transaction:', error);
      //TODO: Discuss this
      // debitTransaction.status = Status.REFUND;
      // await debitTransaction.save();

      // // Refund the sender's balance to its original state
      // await this.walletService.refundBalance(
      //   transaction.senderId,
      //   transaction.amount,
      //   session,
      // );

      throw new InternalServerErrorException(
        'Failed to process credit transaction',
      );
    }
  }

  async denyTransaction(debitTransactionId: Types.ObjectId) {
    const session = await this.transactionModel.db.startSession();
    session.startTransaction();

    try {
      const debitTransaction = await this.transactionModel
        .findById(debitTransactionId)
        .session(session);

      if (!debitTransaction) {
        throw new NotFoundException('Debit transaction not found');
      }

      if (debitTransaction.status !== Status.PENDING) {
        throw new BadRequestException('Transaction is not pending');
      }

      debitTransaction.status = Status.REFUND;
      await debitTransaction.save({ session });

      // Refund the amount back to the sender's wallet
      await this.walletService.refundGiveableBalance(
        debitTransaction.userId,
        Math.abs(debitTransaction.amount),
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error('Error denying transaction:', error);
      throw new InternalServerErrorException('Failed to deny the transaction');
    } finally {
      session.endSession();
    }
  }

  async getTransactionsByRecognition(recognitionId: Types.ObjectId) {
    return this.transactionModel
      .find({
        entityType: EntityType.RECOGNITION,
        entityId: recognitionId,
      })
      .populate('userId', 'name');
  }
}
