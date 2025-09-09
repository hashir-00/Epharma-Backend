import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middleware/auth';
import { AuthUtils } from '../utils/auth';
import { ApiResponse } from '../types';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         address:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         isActive:
 *           type: boolean
 *         isEmailVerified:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export class UserController {
  /**
   * @swagger
   * /users/profile:
   *   get:
   *     summary: Get user profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserProfile'
   */
  static getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({
      where: { id: req.user!.userId },
      select: ['id', 'firstName', 'lastName', 'email', 'phone', 'address', 'dateOfBirth', 'isActive', 'isEmailVerified', 'createdAt', 'updatedAt']
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: user,
      message: 'Profile retrieved successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /users/profile:
   *   put:
   *     summary: Update user profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               phone:
   *                 type: string
   *               address:
   *                 type: string
   *               dateOfBirth:
   *                 type: string
   *                 format: date
   *     responses:
   *       200:
   *         description: Profile updated successfully
   */
  static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ where: { id: req.user!.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { firstName, lastName, phone, address, dateOfBirth } = req.body;

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);

    // Validate updated user data
    const errors = await validate(user);
    if (errors.length > 0) {
      throw new AppError('Validation failed', 400);
    }

    await userRepository.save(user);

    logger.info(`User profile updated: ${user.email}`);

    const response: ApiResponse = {
      success: true,
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified
      },
      message: 'Profile updated successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /users/change-password:
   *   post:
   *     summary: Change user password
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *                 minLength: 6
   *     responses:
   *       200:
   *         description: Password changed successfully
   */
  static changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userRepository = AppDataSource.getRepository(User);
    
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters long', 400);
    }

    const user = await userRepository.findOne({ where: { id: req.user!.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await AuthUtils.comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    user.password = await AuthUtils.hashPassword(newPassword);
    await userRepository.save(user);

    logger.info(`Password changed for user: ${user.email}`);

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /users/deactivate:
   *   post:
   *     summary: Deactivate user account
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Account deactivated successfully
   */
  static deactivateAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ where: { id: req.user!.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.isActive = false;
    await userRepository.save(user);

    logger.info(`Account deactivated for user: ${user.email}`);

    const response: ApiResponse = {
      success: true,
      message: 'Account deactivated successfully'
    };

    res.status(200).json(response);
  });
}
