import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { Types } from 'mongoose';
import { Order } from './schema/Order.schema';
import { OrderItem } from './dto/order.dto';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('place')
  async placeOrder(
    @Request() req,
    @Body() orderItems: OrderItem[],
  ): Promise<Order> {
    const userId = req.user?.userId;
    return this.orderService.placeOrder(userId, orderItems);
  }

  @Get()
  async getOrders(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<{ orders: Order[]; total: number; totalPages: number }> {
    const userIdObj = userId ? new Types.ObjectId(userId) : undefined;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.orderService.getOrders(
      userIdObj,
      status,
      pageNumber,
      limitNumber,
    );
  }

  @Patch('admin/approve/:orderId')
  async approveOrder(@Param('orderId') orderId: string): Promise<Order> {
    return this.orderService.approveOrder(new Types.ObjectId(orderId));
  }

  @Patch('admin/reject/:orderId')
  async rejectOrder(@Param('orderId') orderId: string): Promise<Order> {
    return this.orderService.rejectOrder(new Types.ObjectId(orderId));
  }

  @Patch('user/cancel/:orderId')
  async cancelOrder(
    @Request() req,
    @Param('orderId') orderId: string,
  ): Promise<Order> {
    const userId = req.user?.userId;
    return this.orderService.cancelOrder(
      new Types.ObjectId(userId),
      new Types.ObjectId(orderId),
    );
  }
}
