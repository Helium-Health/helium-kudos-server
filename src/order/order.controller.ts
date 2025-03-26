import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { OrderService } from './order.service';
import { Types } from 'mongoose';
import { Order } from './schema/Order.schema';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { CreateOrderDto } from './dto/order.dto';
import { ActiveUserGuard } from 'src/auth/guards/active-user.guard';

@UseGuards(JwtAuthGuard)
@UseGuards(ActiveUserGuard)
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async placeOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user?.userId;
    return this.orderService.placeOrder(userId, createOrderDto);
  }

  @Get()
  async getOrders(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('recent') recent?: 'ASCENDING_ORDER' | 'DESCENDING_ORDER',
    @Query('search') search?: string,
  ): Promise<{ orders: Order[]; total: number; totalPages: number }> {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.orderService.getOrders(
      userId ? new Types.ObjectId(userId) : undefined,
      status,
      pageNumber,
      limitNumber,
      recent,
      search,
    );
  }

  @UseGuards(AdminGuard)
  @Patch(':orderId/in-progress')
  async markOrderInProgress(
    @Param('orderId') orderId: Types.ObjectId,
    @Body('expectedDeliveryDate') expectedDeliveryDate: string,
  ) {
    const response = await this.orderService.markOrderInProgress(
      orderId,
      expectedDeliveryDate,
    );
    return response;
  }

  @Patch(':orderId/cancel')
  async cancelOrder(@Param('orderId') orderId: Types.ObjectId, @Request() req) {
    const userId = req.user?.userId;
    const response = await this.orderService.cancelOrder(orderId, userId);
    return response;
  }

  @UseGuards(AdminGuard)
  @Patch(':orderId/reject')
  async rejectOrder(@Param('orderId') orderId: Types.ObjectId) {
    const response = await this.orderService.rejectOrder(orderId);
    return response;
  }

  @Patch(':orderId/deliver')
  async deliverOrder(
    @Request() req,
    @Param('orderId') orderId: Types.ObjectId,
  ) {
    const userId = req.user.userId;
    const response = await this.orderService.deliverOrder(orderId, userId);
    return response;
  }
}
