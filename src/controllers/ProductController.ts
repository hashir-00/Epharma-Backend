import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, PaginationQuery } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { ProductService } from '../services/ProductService';

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductCreate:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - price
 *         - stockQuantity
 *         - category
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *           minimum: 0
 *         stockQuantity:
 *           type: integer
 *           minimum: 0
 *         category:
 *           type: string
 *         requiresPrescription:
 *           type: boolean
 *         imageUrl:
 *           type: string
 */

export class ProductController {
  /**
   * @swagger
   * /products:
   *   get:
   *     summary: Get all products with pagination and filtering
   *     tags: [Products]
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
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by category
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search by product name or description
   *       - in: query
   *         name: requiresPrescription
   *         schema:
   *           type: boolean
   *         description: Filter by prescription requirement
   *     responses:
   *       200:
   *         description: Products retrieved successfully
   */
  static getProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20, category, search, requiresPrescription } = req.query as PaginationQuery & {
      category?: string;
      search?: string;
      requiresPrescription?: string;
    };

    const filters = {
      category,
      search,
      requiresPrescription: requiresPrescription ? requiresPrescription === 'true' : undefined
    };

    const result = await ProductService.getProducts(page, limit, filters);

    const response: ApiResponse = {
      success: true,
      data: result.products,
      pagination: result.pagination
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /products/{id}:
   *   get:
   *     summary: Get product by ID
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Product retrieved successfully
   *       404:
   *         description: Product not found
   */
  static getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const product = await ProductService.getProductById(req.params.id);

    const response: ApiResponse = {
      success: true,
      data: product,
      message: 'Product retrieved successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /products:
   *   post:
   *     summary: Create a new product (Pharmacy only)
   *     tags: [Products]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ProductCreate'
   *     responses:
   *       201:
   *         description: Product created successfully
   */
  static createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { name, description, price, stockQuantity, category, requiresPrescription, imageUrl } = req.body;
    
    const productData = {
      name,
      description,
      price,
      stockQuantity,
      category,
      requiresPrescription,
      imageUrl
    };

    const product = await ProductService.createProduct(req.user!.userId, productData);

    const response: ApiResponse = {
      success: true,
      data: product,
      message: 'Product created successfully and is pending approval'
    };

    res.status(201).json(response);
  });

  /**
   * @swagger
   * /products/{id}:
   *   put:
   *     summary: Update product (Pharmacy only)
   *     tags: [Products]
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
   *             $ref: '#/components/schemas/ProductCreate'
   *     responses:
   *       200:
   *         description: Product updated successfully
   */
  static updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { name, description, price, stockQuantity, category, requiresPrescription, imageUrl } = req.body;
    
    const updateData = {
      name,
      description,
      price,
      stockQuantity,
      category,
      requiresPrescription,
      imageUrl
    };

    const product = await ProductService.updateProduct(req.user!.userId, req.params.id, updateData);

    const response: ApiResponse = {
      success: true,
      data: product,
      message: 'Product updated successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /products/{id}:
   *   delete:
   *     summary: Delete product (Pharmacy only)
   *     tags: [Products]
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
   *         description: Product deleted successfully
   */
  static deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await ProductService.deleteProduct(req.user!.userId, req.params.id);

    const response: ApiResponse = {
      success: true,
      message: 'Product deleted successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /products/pharmacy/{pharmacyId}:
   *   get:
   *     summary: Get products by pharmacy
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: pharmacyId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Pharmacy products retrieved successfully
   */
  static getProductsByPharmacy = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20 } = req.query as PaginationQuery;
    
    const result = await ProductService.getProductsByPharmacy(req.params.pharmacyId, page, limit);

    const response: ApiResponse = {
      success: true,
      data: result.products,
      pagination: result.pagination
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /products/categories:
   *   get:
   *     summary: Get all product categories
   *     tags: [Products]
   *     responses:
   *       200:
   *         description: Categories retrieved successfully
   */
  static getCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const categories = await ProductService.getCategories();

    const response: ApiResponse = {
      success: true,
      data: { categories },
      message: 'Categories retrieved successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /products/pharmacies:
   *   get:
   *     summary: Get all active pharmacies
   *     tags: [Products]
   *     responses:
   *       200:
   *         description: Pharmacies retrieved successfully
   */
  static getPharmacies = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const pharmacyData = await ProductService.getVerifiedPharmacies();
    const pharmacyList = pharmacyData.map(pharmacy => pharmacy.name).filter(Boolean);

    const response: ApiResponse = {
      success: true,
      data: {
        pharmacies: pharmacyList.length > 0 ? pharmacyList : [
          'MedMart Pharmacy',
          'HealthPlus Pharmacy', 
          'WellCare Pharmacy',
          'CityMed Pharmacy'
        ]
      },
      message: 'Pharmacies retrieved successfully'
    };

    res.status(200).json(response);
  });
}
