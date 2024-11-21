import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/Order.schema';
import { WalletModule } from 'src/wallet/wallet.module';
import { ProductModule } from 'src/product/product.module';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [
    TransactionModule,
    WalletModule,
    ProductModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
