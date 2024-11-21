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

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private walletService: WalletService,
    private productService: ProductService,
    private readonly transactionService: TransactionService,
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
        status: OrderStatus.PENDING,
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
  ): Promise<{ orders: any[]; total: number; totalPages: number }> {
    const filter: { userId?: Types.ObjectId; status?: string } = {};

    if (userId && Types.ObjectId.isValid(userId)) {
      filter.userId = new Types.ObjectId(userId);
    }

    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      this.orderModel.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
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

  async approveOrder(orderId: Types.ObjectId): Promise<any> {
    const order = await this.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be approved');
    }

    const session = await this.orderModel.db.startSession();
    session.startTransaction();

    try {
      for (const orderItem of order.items) {
        await this.productService.deductStock(
          orderItem.productId,
          orderItem.variants,
          orderItem.quantity,
          session,
        );
      }

      order.status = OrderStatus.APPROVED;
      await order.save({ session });

      await session.commitTransaction();

      return { message: 'Order approved successfully', order };
    } catch (error) {
      console.error('Error approving order:', error);
      await session.abortTransaction();
      throw new BadRequestException('Order approval failed');
    } finally {
      session.endSession();
    }
  }

  async rejectOrder(orderId: Types.ObjectId): Promise<any> {
    const order = await this.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    if (order.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be rejected');
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
