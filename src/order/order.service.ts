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
import { OrderItem } from './dto/order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private walletService: WalletService,
    private productService: ProductService,
  ) {}

  async getOrders(
    userId?: Types.ObjectId,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ orders: Order[]; total: number; totalPages: number }> {
    const filter: { userId?: Types.ObjectId; status?: string } = {};

    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const total = await this.orderModel.countDocuments(filter).exec();

    const skip = (page - 1) * limit;

    const orders = await this.orderModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const totalPages = Math.ceil(total / limit);

    return { orders, total, totalPages };
  }

  async placeOrder(userId: Types.ObjectId, items: OrderItem[]): Promise<Order> {
    let totalAmount = 0;

    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.productService.findById(
          item.productId.toString(),
        );
        if (!product) {
          throw new BadRequestException(
            `Product with ID ${item.productId} not found`,
          );
        }

        let price = product.basePrice;

        const matchedVariants = [];

        if (item.variants && item.variants.length > 0) {
          for (const itemVariant of item.variants) {
            const matchedVariant = product.variants.find(
              (v) =>
                v.variantType === itemVariant.variantType &&
                v.value === itemVariant.value,
            );

            if (!matchedVariant) {
              throw new BadRequestException(
                `Variant ${itemVariant.variantType} - ${itemVariant.value} not available for product ${product.name}`,
              );
            }

            price = matchedVariant.price;
            matchedVariants.push({
              variantType: matchedVariant.variantType,
              value: matchedVariant.value,
            });
          }
        }

        const itemTotal = price * item.quantity;
        totalAmount += itemTotal;

        return {
          productId: item.productId,
          name: product.name,
          price,
          quantity: item.quantity,
          variants: matchedVariants,
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
    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      const order = await this.orderModel.findById(orderId).session(session);
      if (!order || order.status !== 'pending') {
        throw new NotFoundException('Pending order not found');
      }

      order.status = 'approved';

      for (const item of order.items) {
        await this.productService.deductStock(
          item.productId,
          item.variant[0].variantType,
          item.variant[0].value,
          item.quantity,
          session,
        );
      }

      await order.save({ session });
      await session.commitTransaction();
      return order;
    } catch (error) {
      console.error('Failed to approve order:', error);
      await session.abortTransaction();
      throw new BadRequestException('Failed to approve order');
    } finally {
      session.endSession();
    }
  }
  async rejectOrder(orderId: Types.ObjectId): Promise<Order> {
    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      const order = await this.orderModel.findById(orderId).session(session);
      if (!order || order.status !== 'pending') {
        throw new NotFoundException('Pending order not found');
      }

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

  async cancelOrder(
    userId: Types.ObjectId,
    orderId: Types.ObjectId,
  ): Promise<Order> {
    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      const order = await this.orderModel
        .findOne({
          _id: orderId,
          userId: new Types.ObjectId(userId),
        })
        .session(session);

      if (!order || order.status !== 'pending') {
        throw new NotFoundException('Pending order not found');
      }

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
      console.error('Order cancelation failed:', error);
      await session.abortTransaction();
      throw new BadRequestException('Failed to cancel order');
    } finally {
      session.endSession();
    }
  }
}
