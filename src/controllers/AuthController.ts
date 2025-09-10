import { Request, Response } from 'express';
import { UserRole, ApiResponse } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthService } from '../services/AuthService';

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         token:
 *           type: string
 *         user:
 *           type: object
 */

export class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - firstName
   *               - lastName
   *               - email
   *               - password
   *             properties:
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 6
   *               phone:
   *                 type: string
   *               address:
   *                 type: string
   *               dateOfBirth:
   *                 type: string
   *                 format: date
   *     responses:
   *       201:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   */
  static register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { firstName, lastName, name, email, password, phone, address, dateOfBirth } = req.body;

    // Handle name field if firstName and lastName are not provided
    let userFirstName = firstName;
    let userLastName = lastName;
    
    if (!firstName && !lastName && name) {
      const nameParts = name.trim().split(' ');
      userFirstName = nameParts[0] || '';
      userLastName = nameParts.slice(1).join(' ') || '';
    }

    const userData = {
      firstName: userFirstName,
      lastName: userLastName,
      email,
      password,
      phone,
      address,
      dateOfBirth
    };

    const result = await AuthService.registerUser(userData);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'User registered successfully'
    };

    res.status(201).json(response);
  });

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   */
  static login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const result = await AuthService.login({ email, password, role: UserRole.USER });

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Login successful'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /auth/admin/login:
   *   post:
   *     summary: Admin login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Admin login successful
   */
  static adminLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const result = await AuthService.login({ email, password, role: UserRole.ADMIN });

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Admin login successful'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /auth/pharmacy/login:
   *   post:
   *     summary: Pharmacy login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Pharmacy login successful
   */
  static pharmacyLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const result = await AuthService.login({ email, password, role: UserRole.PHARMACY });

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Pharmacy login successful'
    };

    res.status(200).json(response);
  });
}
