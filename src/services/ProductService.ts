import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { Pharmacy } from '../entities/Pharmacy';
import { ProductStatus } from '../types';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  requiresPrescription?: boolean;
  imageUrl?: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  stockQuantity?: number;
  category?: string;
  requiresPrescription?: boolean;
  imageUrl?: string;
}

export interface ProductFilter {
  category?: string;
  requiresPrescription?: boolean;
  status?: ProductStatus;
  pharmacyId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface PaginatedProducts {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ProductService {
  static async getProducts(
    page: number = 1, 
    limit: number = 20, 
    filters: ProductFilter = {}
  ): Promise<PaginatedProducts> {
    const productRepository = AppDataSource.getRepository(Product);
    const offset = (page - 1) * limit;

    let queryBuilder = productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.pharmacy', 'pharmacy')
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

    // Apply filters
    if (filters.category) {
      queryBuilder = queryBuilder.andWhere('product.category = :category', { category: filters.category });
    }

    if (filters.requiresPrescription !== undefined) {
      queryBuilder = queryBuilder.andWhere('product.requiresPrescription = :requiresPrescription', { 
        requiresPrescription: filters.requiresPrescription 
      });
    }

    if (filters.pharmacyId) {
      queryBuilder = queryBuilder.andWhere('product.pharmacyId = :pharmacyId', { pharmacyId: filters.pharmacyId });
    }

    if (filters.search) {
      queryBuilder = queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.minPrice !== undefined) {
      queryBuilder = queryBuilder.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder = queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    const total = await queryBuilder.getCount();
    const products = await queryBuilder
      .orderBy('product.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async getProductById(productId: string): Promise<Product> {
    const productRepository = AppDataSource.getRepository(Product);

    const product = await productRepository.findOne({
      where: { id: productId },
      relations: ['pharmacy'],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stockQuantity: true,
        category: true,
        requiresPrescription: true,
        imageUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        pharmacy: {
          id: true,
          name: true,
          phone: true,
          address: true,
          isVerified: true
        }
      }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return product;
  }

  static async createProduct(pharmacyId: string, productData: CreateProductData): Promise<Product> {
    const productRepository = AppDataSource.getRepository(Product);
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);

    // Verify pharmacy exists and is verified
    const pharmacy = await pharmacyRepository.findOne({
      where: { id: pharmacyId, isVerified: true, isActive: true }
    });

    if (!pharmacy) {
      throw new AppError('Verified pharmacy not found', 404);
    }

    const { name, description, price, stockQuantity, category, requiresPrescription, imageUrl } = productData;

    // Validate required fields
    if (!name || !description || price === undefined || stockQuantity === undefined || !category) {
      throw new AppError('All required fields must be provided', 400);
    }

    // Create new product
    const product = new Product();
    product.name = name;
    product.description = description;
    product.price = price;
    product.stockQuantity = stockQuantity;
    product.category = category;
    product.requiresPrescription = requiresPrescription || false;
    if (imageUrl) {
      product.imageUrl = imageUrl;
    }
    product.pharmacyId = pharmacyId;
    product.status = ProductStatus.PENDING_APPROVAL;

    // Validate product data
    const errors = await validate(product);
    if (errors.length > 0) {
      const validationErrors = errors.map(error => ({
        property: error.property,
        constraints: error.constraints
      }));
      logger.error('Product validation failed:', validationErrors);
      throw new AppError(`Validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`, 400);
    }

    const savedProduct = await productRepository.save(product);

    logger.info(`Product created by pharmacy ${pharmacy.name}: ${savedProduct.name}`);

    return savedProduct;
  }

  static async updateProduct(pharmacyId: string, productId: string, updateData: UpdateProductData): Promise<Product> {
    const productRepository = AppDataSource.getRepository(Product);

    const product = await productRepository.findOne({
      where: { id: productId, pharmacyId },
      relations: ['pharmacy']
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const { name, description, price, stockQuantity, category, requiresPrescription, imageUrl } = updateData;

    // Update product fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (stockQuantity !== undefined) product.stockQuantity = stockQuantity;
    if (category) product.category = category;
    if (requiresPrescription !== undefined) product.requiresPrescription = requiresPrescription;
    if (imageUrl) product.imageUrl = imageUrl;

    // Set status to pending approval if significant changes are made
    if (name || description || requiresPrescription !== undefined) {
      product.status = ProductStatus.PENDING_APPROVAL;
    }

    // Validate updated product data
    const errors = await validate(product);
    if (errors.length > 0) {
      const validationErrors = errors.map(error => ({
        property: error.property,
        constraints: error.constraints
      }));
      logger.error('Product update validation failed:', validationErrors);
      throw new AppError(`Validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`, 400);
    }

    const updatedProduct = await productRepository.save(product);

    logger.info(`Product updated: ${updatedProduct.name}`);

    return updatedProduct;
  }

  static async deleteProduct(pharmacyId: string, productId: string): Promise<void> {
    const productRepository = AppDataSource.getRepository(Product);

    const product = await productRepository.findOne({
      where: { id: productId, pharmacyId }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Soft delete by setting status to inactive
    product.status = ProductStatus.INACTIVE;
    await productRepository.save(product);

    logger.info(`Product deleted: ${product.name}`);
  }

  static async getProductsByPharmacy(
    pharmacyId: string, 
    page: number = 1, 
    limit: number = 20, 
    status?: ProductStatus
  ): Promise<PaginatedProducts> {
    const productRepository = AppDataSource.getRepository(Product);
    const offset = (page - 1) * limit;

    const whereClause: any = { pharmacyId };
    if (status) {
      whereClause.status = status;
    }

    const [products, total] = await productRepository.findAndCount({
      where: whereClause,
      relations: ['pharmacy'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async getCategories(): Promise<string[]> {
    const productRepository = AppDataSource.getRepository(Product);

    const categories = await productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.status = :status', { status: ProductStatus.ACTIVE })
      .getRawMany();

    return categories.map(cat => cat.category).filter(Boolean).sort();
  }

  static async getVerifiedPharmacies(): Promise<Pharmacy[]> {
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);

    const pharmacies = await pharmacyRepository.find({
      where: { isVerified: true, isActive: true },
      select: ['id', 'name', 'address', 'phone'],
      order: { name: 'ASC' }
    });

    return pharmacies;
  }

  // Admin methods
  static async getAllProductsForAdmin(
    page: number = 1, 
    limit: number = 20, 
    status?: ProductStatus
  ): Promise<PaginatedProducts> {
    const productRepository = AppDataSource.getRepository(Product);
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [products, total] = await productRepository.findAndCount({
      where: whereClause,
      relations: ['pharmacy'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async updateProductStatus(productId: string, status: ProductStatus): Promise<void> {
    const productRepository = AppDataSource.getRepository(Product);

    const product = await productRepository.findOne({
      where: { id: productId },
      relations: ['pharmacy']
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    product.status = status;
    await productRepository.save(product);

    logger.info(`Product status updated: ${product.name} -> ${status}`);
  }
}
