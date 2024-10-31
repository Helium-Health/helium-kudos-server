import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { Types } from 'mongoose';
import { PlaceOrderRequestDto } from './dto/order.dto';
import { Order } from './schema/Order.schema';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('place')
  async placeOrder(
    @Request() req,
    @Body() placeOrderRequestDto: PlaceOrderRequestDto,
  ): Promise<Order> {
    const userId = req.user?.userId;

    return this.orderService.placeOrder(userId, placeOrderRequestDto.items);
  }
  @Get()
  async getOrders(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
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
  async approveOrder(@Param('orderId') orderId: Types.ObjectId) {
    return this.orderService.approveOrder(orderId);
  }

  @Patch('admin/reject/:orderId')
  async rejectOrder(@Param('orderId') orderId: Types.ObjectId) {
    return this.orderService.rejectOrder(orderId);
  }

  @Patch('user/cancel/:orderId')
  async cancelOrder(@Request() req, @Param('orderId') orderId: Types.ObjectId) {
    const userId = req.user.userId;
    return this.orderService.cancelOrder(userId, orderId);
  }
}
