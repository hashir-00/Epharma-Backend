import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Admin } from '../entities/Admin';
import { Pharmacy } from '../entities/Pharmacy';
import { AuthUtils } from '../utils/auth';
import { UserRole, ApiResponse } from '../types';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

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
    const userRepository = AppDataSource.getRepository(User);
    
    const { firstName, lastName, name, email, password, phone, address, dateOfBirth } = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Handle name field if firstName and lastName are not provided
    let userFirstName = firstName;
    let userLastName = lastName;
    
    if (!firstName && !lastName && name) {
      const nameParts = name.trim().split(' ');
      userFirstName = nameParts[0] || '';
      userLastName = nameParts.slice(1).join(' ') || '';
    }

    // Validate password before hashing
    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    // Validate required fields
    if (!email || !userFirstName) {
      throw new AppError('Email and name are required', 400);
    }

    // Create new user
    const user = new User();
    user.firstName = userFirstName;
    user.lastName = userLastName;
    user.email = email;
    user.password = await AuthUtils.hashPassword(password);
    user.phone = phone;
    user.address = address;
    if (dateOfBirth) {
      user.dateOfBirth = new Date(dateOfBirth);
    }

    // Validate user data (excluding password since it's already validated and hashed)
    const errors = await validate(user, { skipMissingProperties: true });
    if (errors.length > 0) {
      const validationErrors = errors.map(error => ({
        property: error.property,
        constraints: error.constraints
      }));
      logger.error('User validation failed:', validationErrors);
      throw new AppError(`Validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`, 400);
    }

    await userRepository.save(user);

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: UserRole.USER
    });

    logger.info(`New user registered: ${user.email}`);

    const response: ApiResponse = {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          dateOfBirth: user.dateOfBirth,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified
        }
      },
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

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const userRepository = AppDataSource.getRepository(User);
    
    // Find user by email
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact support.', 401);
    }

    // Verify password
    const isValidPassword = await AuthUtils.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: UserRole.USER
    });

    logger.info(`User logged in: ${user.email}`);

    const response: ApiResponse = {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          dateOfBirth: user.dateOfBirth,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified
        }
      },
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

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const adminRepository = AppDataSource.getRepository(Admin);
    
    // Find admin by email
    const admin = await adminRepository.findOne({ where: { email } });
    if (!admin) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new AppError('Account is deactivated. Please contact support.', 401);
    }

    // Verify password
    const isValidPassword = await AuthUtils.comparePassword(password, admin.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: admin.id,
      email: admin.email,
      role: UserRole.ADMIN
    });

    logger.info(`Admin logged in: ${admin.email}`);

    const response: ApiResponse = {
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive
        }
      },
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

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);
    
    // Find pharmacy by email
    const pharmacy = await pharmacyRepository.findOne({ where: { email } });
    if (!pharmacy) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if pharmacy is active and verified
    if (!pharmacy.isActive) {
      throw new AppError('Account is deactivated. Please contact support.', 401);
    }

    if (!pharmacy.isVerified) {
      throw new AppError('Account is not verified. Please wait for admin approval.', 401);
    }

    // Verify password
    const isValidPassword = await AuthUtils.comparePassword(password, pharmacy.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: pharmacy.id,
      email: pharmacy.email,
      role: UserRole.PHARMACY
    });

    logger.info(`Pharmacy logged in: ${pharmacy.email}`);

    const response: ApiResponse = {
      success: true,
      data: {
        token,
        user: {
          id: pharmacy.id,
          name: pharmacy.name,
          email: pharmacy.email,
          phone: pharmacy.phone,
          address: pharmacy.address,
          licenseNumber: pharmacy.licenseNumber,
          isActive: pharmacy.isActive,
          isVerified: pharmacy.isVerified
        }
      },
      message: 'Pharmacy login successful'
    };

    res.status(200).json(response);
  });
}
