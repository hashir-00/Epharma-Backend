import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { Prescription } from '../entities/Prescription';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, PaginationQuery, OrderStatus, PrescriptionStatus } from '../types';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderCreate:
 *       type: object
 *       required:
 *         - items
 *         - shippingAddress
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *         shippingAddress:
 *           type: string
 *         prescriptionId:
 *           type: string
 *           format: uuid
 *         notes:
 *           type: string
 */

export class OrderController {
  /**
   * @swagger
   * /orders:
   *   post:
   *     summary: Create a new order
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/OrderCreate'
   *     responses:
   *       201:
   *         description: Order created successfully
   */
  static createOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const orderRepository = AppDataSource.getRepository(Order);
    const orderItemRepository = AppDataSource.getRepository(OrderItem);
    const productRepository = AppDataSource.getRepository(Product);
    const userRepository = AppDataSource.getRepository(User);
    const prescriptionRepository = AppDataSource.getRepository(Prescription);

    const { items, shippingAddress, prescriptionId, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Order items are required', 400);
    }

    if (!shippingAddress) {
      throw new AppError('Shipping address is required', 400);
    }

    // Verify user exists
    const user = await userRepository.findOne({ where: { id: req.user!.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Start database transaction
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      let totalAmount = 0;
      let requiresPrescription = false;
      const orderItems: OrderItem[] = [];

      // Validate and calculate order items
      for (const item of items) {
        const product = await transactionalEntityManager.findOne(Product, {
          where: { id: item.productId },
          relations: ['pharmacy']
        });

        if (!product) {
          throw new AppError(`Product not found: ${item.productId}`, 404);
        }

        if (product.stockQuantity < item.quantity) {
          throw new AppError(`Insufficient stock for product: ${product.name}`, 400);
        }

        if (product.requiresPrescription) {
          requiresPrescription = true;
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        const orderItem = new OrderItem();
        orderItem.productId = product.id;
        orderItem.quantity = item.quantity;
        orderItem.unitPrice = product.price;
        orderItem.totalPrice = itemTotal;

        orderItems.push(orderItem);

        // Update product stock
        product.stockQuantity -= item.quantity;
        await transactionalEntityManager.save(product);
      }

      // Check prescription requirement
      if (requiresPrescription) {
        if (!prescriptionId) {
          throw new AppError('Prescription is required for this order', 400);
        }

        const prescription = await transactionalEntityManager.findOne(Prescription, {
          where: { 
            id: prescriptionId,
            userId: req.user!.userId,
            status: PrescriptionStatus.APPROVED
          }
        });

        if (!prescription) {
          throw new AppError('Valid approved prescription is required', 400);
        }
      }

      // Create order
      const order = new Order();
      order.userId = user.id;
      order.totalAmount = totalAmount;
      order.shippingAddress = shippingAddress;
      order.prescriptionId = prescriptionId;
      order.notes = notes;
      order.status = OrderStatus.PENDING;

      // Validate order data
      const orderErrors = await validate(order);
      if (orderErrors.length > 0) {
        throw new AppError('Order validation failed', 400);
      }

      const savedOrder = await transactionalEntityManager.save(order);

      // Save order items
      for (const orderItem of orderItems) {
        orderItem.orderId = savedOrder.id;
        await transactionalEntityManager.save(orderItem);
      }

      logger.info(`Order created by user ${user.email}: ${savedOrder.id}`);

      const response: ApiResponse = {
        success: true,
        data: {
          id: savedOrder.id,
          totalAmount: savedOrder.totalAmount,
          status: savedOrder.status,
          shippingAddress: savedOrder.shippingAddress,
          createdAt: savedOrder.createdAt
        },
        message: 'Order created successfully'
      };

      res.status(201).json(response);
    });
  });

  /**
   * @swagger
   * /orders:
   *   get:
   *     summary: Get user's orders
   *     tags: [Orders]
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
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, approved, shipped, delivered, cancelled]
   *         description: Filter by status
   *     responses:
   *       200:
   *         description: Orders retrieved successfully
   */
  static getUserOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const orderRepository = AppDataSource.getRepository(Order);
    
    const { page = 1, limit = 20, status } = req.query as PaginationQuery & { status?: OrderStatus };
    const offset = (page - 1) * limit;

    const whereClause: any = { userId: req.user!.userId };
    if (status) {
      whereClause.status = status;
    }

    const [orders, total] = await orderRepository.findAndCount({
      where: whereClause,
      relations: ['orderItems', 'orderItems.product'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse = {
      success: true,
      data: orders,
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
   * /orders/{id}:
   *   get:
   *     summary: Get order by ID
   *     tags: [Orders]
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
   *         description: Order retrieved successfully
   *       404:
   *         description: Order not found
   */
  static getOrderById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const orderRepository = AppDataSource.getRepository(Order);
    
    const order = await orderRepository.findOne({
      where: { 
        id: req.params.id,
        userId: req.user!.userId
      },
      relations: ['orderItems', 'orderItems.product', 'orderItems.product.pharmacy']
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: order,
      message: 'Order retrieved successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /orders/{id}/cancel:
   *   post:
   *     summary: Cancel order
   *     tags: [Orders]
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
   *         description: Order cancelled successfully
   *       400:
   *         description: Order cannot be cancelled
   */
  static cancelOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const orderRepository = AppDataSource.getRepository(Order);
    const productRepository = AppDataSource.getRepository(Product);
    
    const order = await orderRepository.findOne({
      where: { 
        id: req.params.id,
        userId: req.user!.userId
      },
      relations: ['orderItems']
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Only allow cancellation for pending orders
    if (order.status !== OrderStatus.PENDING) {
      throw new AppError('Order cannot be cancelled', 400);
    }

    // Start database transaction to restore stock
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      // Restore product stock
      for (const orderItem of order.orderItems) {
        const product = await transactionalEntityManager.findOne(Product, {
          where: { id: orderItem.productId }
        });

        if (product) {
          product.stockQuantity += orderItem.quantity;
          await transactionalEntityManager.save(product);
        }
      }

      // Update order status
      order.status = OrderStatus.CANCELLED;
      await transactionalEntityManager.save(order);
    });

    logger.info(`Order cancelled by user: ${order.id}`);

    const response: ApiResponse = {
      success: true,
      message: 'Order cancelled successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /orders/{id}/track:
   *   get:
   *     summary: Track order status
   *     tags: [Orders]
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
   *         description: Order tracking information
   */
  static trackOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const orderRepository = AppDataSource.getRepository(Order);
    
    const order = await orderRepository.findOne({
      where: { 
        id: req.params.id,
        userId: req.user!.userId
      },
      select: ['id', 'status', 'trackingNumber', 'estimatedDeliveryDate', 'createdAt', 'updatedAt']
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        orderDate: order.createdAt,
        lastUpdated: order.updatedAt
      },
      message: 'Order tracking information retrieved successfully'
    };

    res.status(200).json(response);
  });
}
