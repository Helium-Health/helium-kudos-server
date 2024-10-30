import { Injectable } from '@nestjs/common';
import { Product } from './schema/Product.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}
  async findAllPaginated(
    page: number,
    limit: number,
    category?: string,
  ): Promise<Product[]> {
    const skip = (page - 1) * limit;
    const query = category ? { category } : {};

    return this.productModel.find(query).skip(skip).limit(limit).exec();
  }
}
