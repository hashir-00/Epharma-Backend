import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Pharmacy } from '../entities/Pharmacy';
import { Product } from '../entities/Product';
import { Prescription } from '../entities/Prescription';
import { Order } from '../entities/Order';
import { PaginationQuery, PrescriptionStatus, ProductStatus, OrderStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface DashboardData {
  statistics: {
    users: { total: number };
    pharmacies: { total: number; verified: number; pending: number };
    products: { total: number; active: number; pending: number };
    prescriptions: { pending: number; approved: number; rejected: number };
    orders: { total: number; pending: number; delivered: number };
    revenue: { total: number };
  };
  recentActivities: {
    orders: any[];
    prescriptions: any[];
  };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AdminService {
  static async getDashboardData(): Promise<DashboardData> {
    const userRepository = AppDataSource.getRepository(User);
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);
    const productRepository = AppDataSource.getRepository(Product);
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    const orderRepository = AppDataSource.getRepository(Order);

    // Get counts
    const totalUsers = await userRepository.count({ where: { isActive: true } });
    const totalPharmacies = await pharmacyRepository.count({ where: { isActive: true } });
    const verifiedPharmacies = await pharmacyRepository.count({ where: { isVerified: true, isActive: true } });
    const totalProducts = await productRepository.count();
    const activeProducts = await productRepository.count({ where: { status: ProductStatus.ACTIVE } });
    
    const pendingPrescriptions = await prescriptionRepository.count({ where: { status: PrescriptionStatus.PENDING } });
    const approvedPrescriptions = await prescriptionRepository.count({ where: { status: PrescriptionStatus.APPROVED } });
    
    const totalOrders = await orderRepository.count();
    const pendingOrders = await orderRepository.count({ where: { status: OrderStatus.PENDING } });
    const deliveredOrders = await orderRepository.count({ where: { status: OrderStatus.DELIVERED } });

    // Get revenue (sum of delivered orders)
    const revenueResult = await orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .getRawOne();

    const totalRevenue = parseFloat(revenueResult?.total) || 0;

    // Get recent activities
    const recentOrders = await orderRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 5,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        user: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    });

    const recentPrescriptions = await prescriptionRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 5,
      select: {
        id: true,
        originalName: true,
        status: true,
        createdAt: true,
        user: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    });

    return {
      statistics: {
        users: {
          total: totalUsers
        },
        pharmacies: {
          total: totalPharmacies,
          verified: verifiedPharmacies,
          pending: totalPharmacies - verifiedPharmacies
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          pending: await productRepository.count({ where: { status: ProductStatus.PENDING_APPROVAL } })
        },
        prescriptions: {
          pending: pendingPrescriptions,
          approved: approvedPrescriptions,
          rejected: await prescriptionRepository.count({ where: { status: PrescriptionStatus.REJECTED } })
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          delivered: deliveredOrders
        },
        revenue: {
          total: totalRevenue
        }
      },
      recentActivities: {
        orders: recentOrders,
        prescriptions: recentPrescriptions
      }
    };
  }

  static async getUsers(page: number = 1, limit: number = 20, search?: string): Promise<PaginatedResult<User>> {
    const userRepository = AppDataSource.getRepository(User);
    const offset = (page - 1) * limit;

    let queryBuilder = userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
        'user.isActive',
        'user.isEmailVerified',
        'user.createdAt'
      ]);

    if (search) {
      queryBuilder = queryBuilder.where(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();
    const users = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async toggleUserStatus(userId: string): Promise<{ isActive: boolean }> {
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.isActive = !user.isActive;
    await userRepository.save(user);

    logger.info(`User status toggled by admin: ${user.email} - Active: ${user.isActive}`);

    return { isActive: user.isActive };
  }

  static async getPharmacies(page: number = 1, limit: number = 20, search?: string): Promise<PaginatedResult<Pharmacy>> {
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);
    const offset = (page - 1) * limit;

    let queryBuilder = pharmacyRepository
      .createQueryBuilder('pharmacy')
      .select([
        'pharmacy.id',
        'pharmacy.name',
        'pharmacy.email',
        'pharmacy.phone',
        'pharmacy.address',
        'pharmacy.licenseNumber',
        'pharmacy.isVerified',
        'pharmacy.isActive',
        'pharmacy.createdAt'
      ]);

    if (search) {
      queryBuilder = queryBuilder.where(
        '(pharmacy.name ILIKE :search OR pharmacy.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();
    const pharmacies = await queryBuilder
      .orderBy('pharmacy.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data: pharmacies,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async verifyPharmacy(pharmacyId: string): Promise<void> {
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);
    
    const pharmacy = await pharmacyRepository.findOne({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new AppError('Pharmacy not found', 404);
    }

    pharmacy.isVerified = true;
    await pharmacyRepository.save(pharmacy);

    logger.info(`Pharmacy verified by admin: ${pharmacy.name}`);
  }

  static async getPrescriptions(page: number = 1, limit: number = 20, status?: PrescriptionStatus): Promise<PaginatedResult<Prescription>> {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [prescriptions, total] = await prescriptionRepository.findAndCount({
      where: whereClause,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        originalName: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        user: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async reviewPrescription(prescriptionId: string, status: PrescriptionStatus, adminNotes?: string, adminId?: string): Promise<void> {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);

    if (!status || ![PrescriptionStatus.APPROVED, PrescriptionStatus.REJECTED].includes(status)) {
      throw new AppError('Valid status (approved/rejected) is required', 400);
    }

    const prescription = await prescriptionRepository.findOne({
      where: { id: prescriptionId },
      relations: ['user']
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    if (prescription.status !== PrescriptionStatus.PENDING) {
      throw new AppError('Prescription has already been reviewed', 400);
    }

    prescription.status = status;
    if (adminNotes) {
      prescription.adminNotes = adminNotes;
    }
    if (adminId) {
      prescription.approvedBy = adminId;
    }
    prescription.approvedAt = new Date();

    await prescriptionRepository.save(prescription);

    logger.info(`Prescription ${status} by admin: ${prescription.id}`);
  }

  static async getProducts(page: number = 1, limit: number = 20, status?: ProductStatus): Promise<PaginatedResult<Product>> {
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
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async approveProduct(productId: string): Promise<void> {
    const productRepository = AppDataSource.getRepository(Product);
    
    const product = await productRepository.findOne({
      where: { id: productId },
      relations: ['pharmacy']
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (product.status !== ProductStatus.PENDING_APPROVAL) {
      throw new AppError('Product is not pending approval', 400);
    }

    product.status = ProductStatus.ACTIVE;
    await productRepository.save(product);

    logger.info(`Product approved by admin: ${product.name}`);
  }

  static async rejectProduct(productId: string): Promise<void> {
    const productRepository = AppDataSource.getRepository(Product);
    
    const product = await productRepository.findOne({
      where: { id: productId },
      relations: ['pharmacy']
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (product.status !== ProductStatus.PENDING_APPROVAL) {
      throw new AppError('Product is not pending approval', 400);
    }

    product.status = ProductStatus.INACTIVE;
    await productRepository.save(product);

    logger.info(`Product rejected by admin: ${product.name}`);
  }
}
