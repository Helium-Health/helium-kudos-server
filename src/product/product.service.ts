import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductResponse } from './schema/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
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
      const categoryObjectIds = createProductDto.categories.map(
        (categoryId) => new Types.ObjectId(categoryId),
      );

      const categories = await this.categoryModel.find({
        _id: { $in: createProductDto.categories },
      });

      if (categories.length !== createProductDto.categories.length) {
        throw new NotFoundException('One or more categories not found');
      }
      createProductDto.categories = categoryObjectIds;
    }

    const product = new this.productModel(createProductDto);
    return product.save();
  }

  // async findAll(
  //   page: number = 1,
  //   limit: number = 10,
  //   category?: string, // Optional filter by category name
  // ): Promise<{
  //   data: ProductResponse[];
  //   meta: {
  //     totalCount: number;
  //     page: number;
  //     limit: number;
  //     totalPages: number;
  //   };
  // }> {
  //   const skip = (page - 1) * limit;

  //   let query: any = {};

  //   console.log('Page:', page, 'Limit:', limit, 'Category filter:', category);

  //   if (category) {
  //     // Fetch categories based on the category name filter
  //     const categories = await this.categoryModel
  //       .find({ name: { $regex: category, $options: 'i' } }) // Case-insensitive match
  //       .exec();

  //     console.log('Fetched categories:', categories);

  //     if (categories.length === 0) {
  //       console.log('No categories found, returning empty result.');
  //       return {
  //         data: [],
  //         meta: {
  //           totalCount: 0,
  //           page,
  //           limit,
  //           totalPages: 0,
  //         },
  //       };
  //     }

  //     // Convert the category _id's to ObjectId (if they're strings, they are converted here)
  //     const categoryIds = categories.map(
  //       (category) => new Types.ObjectId(category._id), // Ensure that category _ids are ObjectId instances
  //     );

  //     console.log('Category IDs to filter by:', categoryIds);

  //     // Update the query to filter by category _id (now converted to ObjectId)
  //     query['categories'] = { $in: categoryIds };
  //   }

  //   console.log('Query being executed:', query);

  //   const [products, totalCount] = await Promise.all([
  //     this.productModel
  //       .find(query) // Apply the category filter if any
  //       .populate('categories') // Populate the category field
  //       .skip(skip)
  //       .limit(limit)
  //       .exec(),
  //     this.productModel.countDocuments(query), // Count matching products
  //   ]);

  //   console.log('Fetched products:', products);
  //   console.log('Total product count:', totalCount);

  //   return {
  //     data: products,
  //     meta: {
  //       totalCount,
  //       page,
  //       limit,
  //       totalPages: Math.ceil(totalCount / limit),
  //     },
  //   };
  // }

async findAll(
  page: number = 1,
  limit: number = 10,
  category?: string, // Optional filter by category name
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

  let query: any = {};

  console.log('Page:', page, 'Limit:', limit, 'Category filter:', category);

  if (category) {
    // Fetch categories based on the category name filter
    const categories = await this.categoryModel
      .find({ name: { $regex: category, $options: 'i' } }) // Case-insensitive match
      .exec();

    console.log('Fetched categories:', categories);

    if (categories.length === 0) {
      console.log('No categories found, returning empty result.');
      return {
        data: [],
        meta: {
          totalCount: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    // Convert the category _id's to ObjectId (if they're strings, they are converted here)
    const categoryIds = categories.map(
      (category) => new Types.ObjectId(category._id), // Ensure that category _ids are ObjectId instances
    );

    console.log('Category IDs to filter by:', categoryIds);

    // Update the query to filter by category _id (now converted to ObjectId)
    query['categories'] = { $in: categoryIds };
  }

  console.log('Query being executed:', query);

  const [products, totalCount] = await Promise.all([
    this.productModel
      .find(query) // Apply the category filter if any
      .populate('categories', 'name') // Populate only the name of the categories
      .skip(skip)
      .limit(limit)
      .exec(),
    this.productModel.countDocuments(query), // Count matching products
  ]);

  console.log('Fetched products:', products);
  console.log('Total product count:', totalCount);

  // Map over the products to ensure the response includes category names
  const productsWithCategories = products.map((product) => {
    const productWithCategoryNames = {
      ...product.toObject(),
      categories: product.categories.map((category: any) => ({
        id: category._id,
        name: category.name,
      })),
    };

    return productWithCategoryNames;
  });

  return {
    data: productsWithCategories,
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
      const categoryObjectIds = updateProductDto.categories.map(
        (categoryId) => new Types.ObjectId(categoryId),
      );

      const categories = await this.categoryModel.find({
        _id: { $in: updateProductDto.categories },
      });

      if (categories.length !== updateProductDto.categories.length) {
        throw new NotFoundException('One or more categories not found');
      }
      updateProductDto.categories = categoryObjectIds;
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
  async deductStock(
    productId: Types.ObjectId,
    variants: any[] | null,
    quantity: number,
    session: ClientSession,
  ) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    if (variants && variants.length > 0) {
      for (const variant of variants) {
        const variantMatch = product.variants.find(
          (v) =>
            v.variantType === variant.variantType && v.value === variant.value,
        );
        if (!variantMatch) {
          throw new BadRequestException(
            `Variant ${variant.variantType}: ${variant.value} not found`,
          );
        }

        if (variantMatch.stock < quantity) {
          throw new BadRequestException(
            `Not enough stock for ${variant.variantType} ${variant.value}`,
          );
        }

        variantMatch.stock -= quantity;
      }
    } else {
      if (product.stock < quantity) {
        throw new BadRequestException('Not enough stock for the product');
      }

      product.stock -= quantity;
    }

    await product.save({ session });
  }
}
