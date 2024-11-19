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

@UseGuards(JwtAuthGuard)
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
  @UseGuards(AdminGuard)
  @Patch(':orderId/approve')
  async approveOrder(@Param('orderId') orderId: Types.ObjectId) {
    const response = await this.orderService.approveOrder(orderId);
    return response;
  }

  @UseGuards(AdminGuard)
  @Patch(':orderId/cancel')
  async cancelOrder(@Param('orderId') orderId: Types.ObjectId, @Request() req) {
    const userId = req.user?.userId;
    const updatedOrder = await this.orderService.cancelOrder(orderId, userId);
    return { message: 'Order cancelled successfully', order: updatedOrder };
  }
}
