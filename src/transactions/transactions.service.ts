import { BadRequestException, Injectable } from '@nestjs/common';
// import { UpdateTransactionDto } from './dto/transaction.dto';
import { Transaction } from 'src/transactions/schema/transaction.schema';
import { ClientSession, Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<Transaction>,
  ) {}
  async createTransaction(
    senderId: Types.ObjectId,
    receiverId: Types.ObjectId,
    amount: number,
    session: ClientSession,
  ) {
    try {
      const transaction = await this.transactionModel.create({
        senderId: senderId,
        receiverId: receiverId,
        amount: amount,
        timestamp: new Date(),
      });
      return transaction.save({ session });
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new BadRequestException('Transaction creation failed');
    }
  }

  // Returns all transactions
  async findAll(): Promise<Transaction[]> {
    return await this.transactionModel.find().exec(); // Fetch all transactions from the database
  }

  // Returns a single transaction by ID
  async findOne(id: Types.ObjectId): Promise<Transaction> {
    return await this.transactionModel.findById(id).exec(); // Fetch the transaction by ID
  }

  // Removes a transaction by ID
  async remove(id: Types.ObjectId): Promise<Transaction> {
    return await this.transactionModel.findByIdAndDelete(id).exec(); // Remove the transaction from the database
  }
}
