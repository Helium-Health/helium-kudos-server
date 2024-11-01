import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductResponse } from './schema/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StorageService } from 'src/storage/storage.service';
import { Category } from './schema/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private readonly storageService: StorageService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    if (createProductDto.categories?.length) {
      const categories = await this.categoryModel.find({
        _id: { $in: createProductDto.categories },
      });

      if (categories.length !== createProductDto.categories.length) {
        throw new NotFoundException('One or more categories not found');
      }
    }

    const product = new this.productModel(createProductDto);
    return product.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: ProductResponse[];
    meta: {
      totalCount: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const [products, totalCount] = await Promise.all([
      this.productModel
        .find()
        .populate('categories')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(),
    ]);

    return {
      data: products,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findById(id: string): Promise<ProductResponse> {
    const product = await this.productModel
      .findById(new Types.ObjectId(id))
      .populate('categories')
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const existingProduct = await this.productModel.findById(
      new Types.ObjectId(id),
    );
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (updateProductDto.categories?.length) {
      const categories = await this.categoryModel.find({
        _id: { $in: updateProductDto.categories },
      });

      if (categories.length !== updateProductDto.categories.length) {
        throw new NotFoundException('One or more categories not found');
      }
    }

    const updatedImages = updateProductDto.images
      ? [...new Set([...existingProduct.images, ...updateProductDto.images])] // Remove duplicates
      : existingProduct.images;

    if (updatedImages.length > 3) {
      throw new BadRequestException('Products cannot have more than 3 images');
    }

    return this.productModel
      .findByIdAndUpdate(
        id,
        { ...updateProductDto, images: updatedImages },
        { new: true },
      )
      .populate('categories')
      .exec();
  }

  async findAllCategories(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }

  async remove(id: string): Promise<void> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.images?.length) {
      await Promise.all(
        product.images.map((url) => this.storageService.deleteFile(url)),
      );
    }

    await this.productModel.findByIdAndDelete(id).exec();
  }

  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    const category = new this.categoryModel(createCategoryDto);
    return category.save();
  }
}
