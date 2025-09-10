import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, PaginationQuery, PrescriptionStatus, ProductStatus } from '../types';
import { validate } from 'class-validator';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AdminService } from '../services/AdminService';

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
    const dashboardData = await AdminService.getDashboardData();

    const response: ApiResponse = {
      success: true,
      data: dashboardData,
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
    const { page = 1, limit = 20, search } = req.query as PaginationQuery & { search?: string };
    
    const result = await AdminService.getUsers(page, limit, search);

    const response: ApiResponse = {
      success: true,
      data: result.data,
      pagination: result.pagination
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
    const result = await AdminService.toggleUserStatus(req.params.id);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: `User ${result.isActive ? 'activated' : 'deactivated'} successfully`
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
    const { page = 1, limit = 20, search } = req.query as PaginationQuery & { search?: string };
    
    const result = await AdminService.getPharmacies(page, limit, search);

    const response: ApiResponse = {
      success: true,
      data: result.data,
      pagination: result.pagination
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
    await AdminService.verifyPharmacy(req.params.id);

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
    const { page = 1, limit = 20, status } = req.query as PaginationQuery & { status?: PrescriptionStatus };
    
    const result = await AdminService.getPrescriptions(page, limit, status);

    const response: ApiResponse = {
      success: true,
      data: result.data,
      pagination: result.pagination
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
    const { status, adminNotes } = req.body;

    await AdminService.reviewPrescription(req.params.id, status, adminNotes, req.user!.userId);

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
    const { page = 1, limit = 20, status } = req.query as PaginationQuery & { status?: ProductStatus };
    
    const result = await AdminService.getProducts(page, limit, status);

    const response: ApiResponse = {
      success: true,
      data: result.data,
      pagination: result.pagination
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
    await AdminService.approveProduct(req.params.id);

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
    await AdminService.rejectProduct(req.params.id);

    const response: ApiResponse = {
      success: true,
      message: 'Product rejected successfully'
    };

    res.status(200).json(response);
  });
}
