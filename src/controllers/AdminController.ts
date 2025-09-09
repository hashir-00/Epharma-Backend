import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Admin } from '../entities/Admin';
import { Pharmacy } from '../entities/Pharmacy';
import { Product } from '../entities/Product';
import { Prescription } from '../entities/Prescription';
import { Order } from '../entities/Order';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, PaginationQuery, PrescriptionStatus, ProductStatus, OrderStatus } from '../types';
import { AuthUtils } from '../utils/auth';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminCreate:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 */

export class AdminController {
  /**
   * @swagger
   * /admin/dashboard:
   *   get:
   *     summary: Get admin dashboard analytics
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dashboard data retrieved successfully
   */
  static getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const response: ApiResponse = {
      success: true,
      data: {
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
      },
      message: 'Dashboard data retrieved successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /admin/users:
   *   get:
   *     summary: Get all users with pagination
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *         description: Number of items per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search by name or email
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   */
  static getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userRepository = AppDataSource.getRepository(User);
    
    const { page = 1, limit = 20, search } = req.query as PaginationQuery & { search?: string };
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

    const response: ApiResponse = {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /admin/users/{id}/toggle-status:
   *   post:
   *     summary: Toggle user active status
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: User status updated successfully
   */
  static toggleUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ where: { id: req.params.id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.isActive = !user.isActive;
    await userRepository.save(user);

    logger.info(`User status toggled by admin: ${user.email} - Active: ${user.isActive}`);

    const response: ApiResponse = {
      success: true,
      data: { isActive: user.isActive },
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /admin/pharmacies:
   *   get:
   *     summary: Get all pharmacies with pagination
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Pharmacies retrieved successfully
   */
  static getPharmacies = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);
    
    const { page = 1, limit = 20, search } = req.query as PaginationQuery & { search?: string };
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

    const response: ApiResponse = {
      success: true,
      data: pharmacies,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /admin/pharmacies/{id}/verify:
   *   post:
   *     summary: Verify pharmacy
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Pharmacy verified successfully
   */
  static verifyPharmacy = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);
    
    const pharmacy = await pharmacyRepository.findOne({ where: { id: req.params.id } });
    if (!pharmacy) {
      throw new AppError('Pharmacy not found', 404);
    }

    pharmacy.isVerified = true;
    await pharmacyRepository.save(pharmacy);

    logger.info(`Pharmacy verified by admin: ${pharmacy.name}`);

    const response: ApiResponse = {
      success: true,
      message: 'Pharmacy verified successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /admin/prescriptions:
   *   get:
   *     summary: Get all prescriptions for review
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Prescriptions retrieved successfully
   */
  static getPrescriptions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    
    const { page = 1, limit = 20, status } = req.query as PaginationQuery & { status?: PrescriptionStatus };
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

    const response: ApiResponse = {
      success: true,
      data: prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /admin/prescriptions/{id}/review:
   *   post:
   *     summary: Review prescription (approve/reject)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [approved, rejected]
   *               adminNotes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Prescription reviewed successfully
   */
  static reviewPrescription = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    
    const { status, adminNotes } = req.body;

    if (!status || ![PrescriptionStatus.APPROVED, PrescriptionStatus.REJECTED].includes(status)) {
      throw new AppError('Valid status (approved/rejected) is required', 400);
    }

    const prescription = await prescriptionRepository.findOne({
      where: { id: req.params.id },
      relations: ['user']
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    if (prescription.status !== PrescriptionStatus.PENDING) {
      throw new AppError('Prescription has already been reviewed', 400);
    }

    prescription.status = status;
    prescription.adminNotes = adminNotes;
    prescription.approvedBy = req.user!.userId;
    prescription.approvedAt = new Date();

    await prescriptionRepository.save(prescription);

    logger.info(`Prescription ${status} by admin: ${prescription.id}`);

    const response: ApiResponse = {
      success: true,
      message: `Prescription ${status} successfully`
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /admin/products:
   *   get:
   *     summary: Get all products for approval
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Products retrieved successfully
   */
  static getProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const productRepository = AppDataSource.getRepository(Product);
    
    const { page = 1, limit = 20, status } = req.query as PaginationQuery & { status?: ProductStatus };
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

    const response: ApiResponse = {
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /admin/products/{id}/approve:
   *   post:
   *     summary: Approve product
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Product approved successfully
   */
  static approveProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const productRepository = AppDataSource.getRepository(Product);
    
    const product = await productRepository.findOne({
      where: { id: req.params.id },
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

    const response: ApiResponse = {
      success: true,
      message: 'Product approved successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /admin/products/{id}/reject:
   *   post:
   *     summary: Reject product
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Product rejected successfully
   */
  static rejectProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const productRepository = AppDataSource.getRepository(Product);
    
    const product = await productRepository.findOne({
      where: { id: req.params.id },
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

    const response: ApiResponse = {
      success: true,
      message: 'Product rejected successfully'
    };

    res.status(200).json(response);
  });
}
