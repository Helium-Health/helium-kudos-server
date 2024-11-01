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
    if (createProductDto.category) {
      const category = await this.categoryModel.findById(
        createProductDto.category,
      );
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${createProductDto.category} not found`,
        );
      }
    }

    const product = new this.productModel(createProductDto);
    return product.save();
  }

  async findAll(): Promise<ProductResponse[]> {
    const products = await this.productModel.find().exec();
    return products;
  }

  async findById(id: string): Promise<ProductResponse> {
    const product = await this.productModel
      .findById(new Types.ObjectId(id))
      .exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findAllCategories(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    if (updateProductDto.category) {
      const category = await this.categoryModel.findById(
        updateProductDto.category,
      );
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateProductDto.category} not found`,
        );
      }
    }

    const existingProduct = await this.productModel.findById(
      new Types.ObjectId(id),
    );
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
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
      .exec();
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
