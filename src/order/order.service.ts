import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schema/Order.schema';
import { WalletService } from '../wallet/wallet.service';
import { ProductService } from 'src/product/product.service';
import { CreateOrderDto, ProductDataDto } from './dto/order.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import {
  EntityType,
  transactionStatus,
} from 'src/transaction/schema/Transaction.schema';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/users/schema/User.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private walletService: WalletService,
    private productService: ProductService,
    private readonly transactionService: TransactionService,
    private readonly userService: UsersService,
  ) {}
  async placeOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    let totalAmount = 0;

    const orderItems = await Promise.all(
      createOrderDto.productData.map(async (data: ProductDataDto) => {
        const product = await this.productService.findById(
          data.productId.toString(),
        );
        if (!product) {
          throw new BadRequestException(
            `Product with ID ${data.productId} not found`,
          );
        }

        let price = product.basePrice;
        const matchedVariants = [];

        if (data.variants && data.variants.length > 0) {
          for (const variant of data.variants) {
            const matchedVariant = product.variants.find(
              (v) =>
                v.variantType === variant.variantType &&
                v.value === variant.value,
            );

            if (!matchedVariant) {
              throw new BadRequestException(
                `Variant ${variant.variantType} - ${variant.value} not available for product ${product.name}`,
              );
            }

            price = matchedVariant.price;
            matchedVariants.push({
              variantType: matchedVariant.variantType,
              value: matchedVariant.value,
              price: matchedVariant.price,
            });
          }
        }

        const itemTotal = price * data.quantity;
        totalAmount += itemTotal;

        return {
          productId: data.productId,
          name: product.name,
          price,
          quantity: data.quantity,
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
        new Types.ObjectId(userId),
        totalAmount,
        session,
      );

      const order = new this.orderModel({
        userId: new Types.ObjectId(userId),
        items: orderItems,
        totalAmount,
        status: OrderStatus.NEW,
      });

      await order.save({ session });
      await this.transactionService.recordDebitTransaction(
        {
          senderId: new Types.ObjectId(userId),
          amount: totalAmount,
          entityType: EntityType.ORDER,
          entityId: order._id as Types.ObjectId,
          receiverId: null,
          claimId: order._id as Types.ObjectId,
          status: transactionStatus.SUCCESS,
        },
        session,
      );
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

  async getOrders(
    userId?: Types.ObjectId,
    status?: string,
    page: number = 1,
    limit: number = 10,
    recent: 'ASCENDING_ORDER' | 'DESCENDING_ORDER' = 'DESCENDING_ORDER',
    search?: string,
  ) {
    const filter: Record<string, any> = {};

    if (userId) filter.userId = userId;

    if (status) filter.status = status;
    const sortDirection = recent === 'ASCENDING_ORDER' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Add search conditions if search parameter exists
    if (search) {
      filter.$or = [
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      this.orderModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: filter },
        { $sort: { createdAt: sortDirection } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            userId: {
              _id: '$user._id',
              name: '$user.name',
              picture: '$user.picture',
            },
            status: 1,
            items: 1,
            totalAmount: 1,
            expectedDeliveryDate: 1,
            createdAt: 1,
          },
        },
      ]),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      orders,
      total: totalCount,
      totalPages,
    };
  }

  async findById(orderId: Types.ObjectId): Promise<OrderDocument | null> {
    return this.orderModel.findById(orderId);
  }

  async markOrderInProgress(
    orderId: Types.ObjectId,
    expectedDeliveryDate: string,
  ): Promise<any> {
    const session = await this.orderModel.startSession();
    session.startTransaction();
    const order = await this.findById(orderId);
    try {
      if (!order) {
        throw new BadRequestException('Order not found');
      }

      if (order.status !== OrderStatus.NEW) {
        throw new BadRequestException(
          'Only new orders can be marked as in progress',
        );
      }

      order.status = OrderStatus.IN_PROGRESS;
      order.expectedDeliveryDate = new Date(expectedDeliveryDate);
      await order.save({ session });

      for (const item of order.items) {
        await this.productService.deductStock(
          item.productId,
          item.variants,
          item.quantity,
          session,
        );
      }
      await session.commitTransaction();
      session.endSession();
      return {
        message: 'Order status updated to in progress successfully',
        order,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Error updating order status to in progress:', error);
      throw new BadRequestException(
        'Failed to update order status to in progress',
      );
    }
  }

  async rejectOrder(orderId: Types.ObjectId): Promise<any> {
    const order = await this.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (![OrderStatus.NEW, OrderStatus.IN_PROGRESS].includes(order.status)) {
      throw new BadRequestException('Only new orders can be rejected.');
    }
    const session = await this.orderModel.db.startSession();
    session.startTransaction();
    try {
      await this.walletService.refundEarnedBalance(
        new Types.ObjectId(order.userId),
        order.totalAmount,
        session,
      );

      await this.transactionService.recordCreditTransaction(
        {
          receiverId: order.userId,
          amount: order.totalAmount,
          entityType: EntityType.ORDER,
          entityId: order.id,
          senderId: null,
          status: transactionStatus.SUCCESS,
          claimId: order.id,
        },
        session,
      );

      order.status = OrderStatus.REJECTED;
      await order.save({ session });
      await session.commitTransaction();
      return {
        message: 'Order rejected and refund processed successfully',
        order,
      };
    } catch (error) {
      console.error('Failed to reject order', error);
      await session.abortTransaction();
      throw new BadRequestException('Failed to reject order');
    } finally {
      session.endSession();
    }
  }

  async deliverOrder(
    orderId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<any> {
    const order = await this.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status !== OrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Only orders in progress can be marked as delivered.',
      );
    }

    try {
      order.status = OrderStatus.DELIVERED;
      order.deliveredAt = new Date();
      order.deliveredBy = userId;
      await order.save();

      return {
        message: 'Order marked as delivered successfully',
        order,
      };
    } catch (error) {
      console.error('Failed to mark order as delivered', error);
      throw new BadRequestException('Failed to mark order as delivered');
    }
  }

  async cancelOrder(
    orderId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<any> {
    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      const order = await this.orderModel.findById(orderId).session(session);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (!order.userId || order.userId.toString() !== userId.toString()) {
        throw new BadRequestException('You can only cancel your own orders');
      }

      if (![OrderStatus.NEW, OrderStatus.IN_PROGRESS].includes(order.status)) {
        throw new BadRequestException('Only new orders can be cancelled.');
      }

      await this.walletService.refundEarnedBalance(
        new Types.ObjectId(order.userId),
        order.totalAmount,
        session,
      );

      await this.transactionService.recordCreditTransaction(
        {
          receiverId: order.userId,
          amount: order.totalAmount,
          entityType: EntityType.ORDER,
          entityId: order.id,
          senderId: null,
          status: transactionStatus.SUCCESS,
          claimId: order.id,
        },
        session,
      );

      order.status = OrderStatus.CANCELED;
      await order.save({ session });

      await session.commitTransaction();
      return {
        message: 'Order cancelled and refund processed successfully',
        order,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Failed to cancel order', error);
      throw new BadRequestException('Failed to cancel order');
    } finally {
      session.endSession();
    }
  }
}
