import { BadRequestException, Injectable } from '@nestjs/common';
// import { UpdateTransactionDto } from './dto/transaction.dto';
import { Transaction } from 'src/schemas/transaction.schema';
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

  findAll() {
    return `This action returns all transactions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  // update(id: number, updateTransactionDto: UpdateTransactionDto) {
  //   return `This action updates a #${id} transaction`;
  // }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
