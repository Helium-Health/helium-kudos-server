import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schema/Order.schema';
import { WalletService } from '../wallet/wallet.service';
import { ProductService } from 'src/product/product.service';
import { PlaceOrderDto } from './dto/order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private walletService: WalletService,
    private productService: ProductService,
  ) {}

  async placeOrder(
    userId: Types.ObjectId,
    items: PlaceOrderDto[],
  ): Promise<Order> {
    let totalAmount = 0;

    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.productService.findProductById(
          item.productId,
        );
        if (!product) {
          throw new BadRequestException(
            `Product with ID ${item.productId} not found`,
          );
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        return {
          productId: item.productId,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          ...(item.variant && { variant: item.variant }),
        };
      }),
    );

    const wallet = await this.walletService.getEarnedCoinBalance(
      userId.toString(),
    );
    if (wallet.earnedBalance < totalAmount) {
      throw new BadRequestException('Insufficient earned balance');
    }

    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      await this.walletService.deductEarnedBalance(
        userId,
        totalAmount,
        session,
      );

      const order = new this.orderModel({
        userId,
        items: orderItems,
        totalAmount,
        status: 'pending',
      });

      await order.save({ session });
      await session.commitTransaction();
      return order;
    } catch (error) {
      console.error('Order placement failed:', error);
      await session.abortTransaction();
      throw new BadRequestException('Order placement failed');
    } finally {
      session.endSession();
    }
  }

  async approveOrder(orderId: Types.ObjectId): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order || order.status !== 'pending') {
      throw new NotFoundException('Pending order not found');
    }
    order.status = 'approved';
    //TODO: Call function to subtract product from inventory
    return order.save();
  }

  async rejectOrder(orderId: Types.ObjectId): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order || order.status !== 'pending') {
      throw new NotFoundException('Pending order not found');
    }

    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      await this.walletService.refundEarnedBalance(
        order.userId,
        order.totalAmount,
        session,
      );
      order.status = 'failed';
      await order.save({ session });
      await session.commitTransaction();
      return order;
    } catch (error) {
      console.error('Failed to reject order', error);
      await session.abortTransaction();
      throw new BadRequestException('Failed to reject order');
    } finally {
      session.endSession();
    }
  }

  async getOrders(
    userId?: Types.ObjectId,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ orders: Order[]; total: number; totalPages: number }> {
    const filter: any = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const total = await this.orderModel.countDocuments(filter);

    const skip = (page - 1) * limit;

    const orders = await this.orderModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(total / limit);

    return { orders, total, totalPages };
  }

  async cancelOrder(
    userId: Types.ObjectId,
    orderId: Types.ObjectId,
  ): Promise<Order> {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });
    if (!order || order.status !== 'pending') {
      throw new NotFoundException('Pending order not found');
    }

    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      await this.walletService.refundEarnedBalance(
        userId,
        order.totalAmount,
        session,
      );
      order.status = 'canceled';
      await order.save({ session });
      await session.commitTransaction();
      return order;
    } catch (error) {
      console.error('Order canceling failed:', error);
      await session.abortTransaction();
      throw new BadRequestException('Failed to cancel order');
    } finally {
      session.endSession();
    }
  }
}
