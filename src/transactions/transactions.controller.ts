import { Controller, Get, Param, Delete } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Types } from 'mongoose';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll() {
    return this.transactionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: Types.ObjectId) {
    return this.transactionsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: Types.ObjectId) {
    return this.transactionsService.remove(id);
  }
}
