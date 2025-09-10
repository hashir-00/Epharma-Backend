import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, PaginationQuery, OrderStatus } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { OrderService } from '../services/OrderService';

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
    const { items, shippingAddress, prescriptionId, notes } = req.body;
    
    const orderData = await OrderService.createOrder(req.user!.userId, {
      items,
      shippingAddress,
      prescriptionId,
      notes
    });

    const response: ApiResponse = {
      success: true,
      data: orderData,
      message: 'Order created successfully'
    };

    res.status(201).json(response);
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
    const { page = 1, limit = 20, status } = req.query as PaginationQuery & { status?: OrderStatus };
    
    const result = await OrderService.getUserOrders(req.user!.userId, page, limit, status);

    const response: ApiResponse = {
      success: true,
      data: result.orders,
      pagination: result.pagination
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
    const order = await OrderService.getOrderById(req.params.id, req.user!.userId);

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
    await OrderService.cancelOrder(req.params.id, req.user!.userId);

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
    const trackingInfo = await OrderService.trackOrder(req.params.id, req.user!.userId);

    const response: ApiResponse = {
      success: true,
      data: trackingInfo,
      message: 'Order tracking information retrieved successfully'
    };

    res.status(200).json(response);
  });
}
