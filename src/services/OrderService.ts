import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { Prescription } from '../entities/Prescription';
import { OrderStatus, PrescriptionStatus } from '../types';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface CreateOrderData {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: string;
  prescriptionId?: string;
  notes?: string;
}

export interface OrderSummary {
  id: string;
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: string;
  createdAt: Date;
  orderItems?: OrderItem[];
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface PaginatedOrders {
  orders: OrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class OrderService {
  static async createOrder(userId: string, orderData: CreateOrderData): Promise<OrderSummary> {
    const orderRepository = AppDataSource.getRepository(Order);
    const orderItemRepository = AppDataSource.getRepository(OrderItem);
    const productRepository = AppDataSource.getRepository(Product);
    const userRepository = AppDataSource.getRepository(User);
    const prescriptionRepository = AppDataSource.getRepository(Prescription);

    const { items, shippingAddress, prescriptionId, notes } = orderData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Order items are required', 400);
    }

    if (!shippingAddress) {
      throw new AppError('Shipping address is required', 400);
    }

    // Verify user exists
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Start database transaction
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
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
            userId: userId,
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
      if (prescriptionId) {
        order.prescriptionId = prescriptionId;
      }
      if (notes) {
        order.notes = notes;
      }
      order.status = OrderStatus.PENDING;

      // Validate order data
      const orderErrors = await validate(order);
      if (orderErrors.length > 0) {
        const validationErrors = orderErrors.map(error => ({
          property: error.property,
          constraints: error.constraints
        }));
        logger.error('Order validation failed:', validationErrors);
        throw new AppError(`Order validation failed: ${orderErrors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`, 400);
      }

      const savedOrder = await transactionalEntityManager.save(order);

      // Save order items
      for (const orderItem of orderItems) {
        orderItem.orderId = savedOrder.id;
        await transactionalEntityManager.save(orderItem);
      }

      logger.info(`Order created by user ${user.email}: ${savedOrder.id}`);

      return {
        id: savedOrder.id,
        totalAmount: savedOrder.totalAmount,
        status: savedOrder.status,
        shippingAddress: savedOrder.shippingAddress,
        createdAt: savedOrder.createdAt
      };
    });
  }

  static async getUserOrders(userId: string, page: number = 1, limit: number = 10, status?: OrderStatus): Promise<PaginatedOrders> {
    const orderRepository = AppDataSource.getRepository(Order);
    const offset = (page - 1) * limit;

    const whereClause: any = { userId };
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

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async getOrderById(userId: string, orderId: string): Promise<OrderSummary> {
    const orderRepository = AppDataSource.getRepository(Order);

    const order = await orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['orderItems', 'orderItems.product', 'orderItems.product.pharmacy', 'prescription', 'user']
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    return order;
  }

  static async cancelOrder(userId: string, orderId: string): Promise<void> {
    const orderRepository = AppDataSource.getRepository(Order);
    const productRepository = AppDataSource.getRepository(Product);

    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const order = await transactionalEntityManager.findOne(Order, {
        where: { id: orderId, userId },
        relations: ['orderItems']
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new AppError('Only pending orders can be cancelled', 400);
      }

      // Restore product stock
      for (const item of order.orderItems) {
        const product = await transactionalEntityManager.findOne(Product, {
          where: { id: item.productId }
        });

        if (product) {
          product.stockQuantity += item.quantity;
          await transactionalEntityManager.save(product);
        }
      }

      // Update order status
      order.status = OrderStatus.CANCELLED;
      await transactionalEntityManager.save(order);

      logger.info(`Order cancelled: ${orderId}`);
    });
  }

  static async trackOrder(userId: string, orderId: string): Promise<OrderSummary> {
    const orderRepository = AppDataSource.getRepository(Order);

    const order = await orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['orderItems', 'orderItems.product']
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    return order;
  }

  // Admin methods
  static async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const orderRepository = AppDataSource.getRepository(Order);

    const order = await orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    order.status = status;
    await orderRepository.save(order);

    logger.info(`Order status updated: ${orderId} -> ${status}`);
  }

  static async getAllOrders(page: number = 1, limit: number = 20, status?: OrderStatus): Promise<PaginatedOrders> {
    const orderRepository = AppDataSource.getRepository(Order);
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [orders, total] = await orderRepository.findAndCount({
      where: whereClause,
      relations: ['user', 'orderItems'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }
}
