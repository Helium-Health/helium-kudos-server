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
        .findById(new Types.ObjectId(debitTransactionId))
        .session(session);

      if (!debitTransaction) {
        throw new NotFoundException('Debit transaction not found');
      }

      if (debitTransaction.status !== Status.PENDING) {
        throw new BadRequestException('Transaction is not pending');
      }

      // Mark the transaction as approved
      debitTransaction.approved = true;
      await debitTransaction.save({ session });

      // Call function to credit the receiver and log transaction
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

      // Update the transaction status
      debitTransaction.status = Status.REVERSED;
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
      // Perform the credit operation
      await this.walletService.incrementEarnedBalance(
        new Types.ObjectId(transaction.receiverId),
        transaction.amount,
        session,
      );
      // Log teh credit transaction.
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

      debitTransaction.status = Status.SUCCESS;
      await debitTransaction.save({ session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();

      debitTransaction.status = Status.FAILED;
      await debitTransaction.save({ session });
      console.error('Error processing credit transaction:', error);

      // TODO: Discuss
      // For any failed transaction, admin should be able to refund sender and set debitTransaction to reversed???

      throw new InternalServerErrorException(
        'Failed to process credit transaction',
      );
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
