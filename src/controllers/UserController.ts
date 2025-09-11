import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { UserService } from '../services/UserService';

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
    const user = await UserService.getUserProfile(req.user!.userId);

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
    const { firstName, lastName, phone, address, age,email } = req.body;

    const updatedUser = await UserService.updateUserProfile(req.user!.userId, {
      firstName,
      lastName,
      phone,
      address,
      age,
      email
    });

    const response: ApiResponse = {
      success: true,
      data: updatedUser,
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
    const { oldPassword, newPassword } = req.body;

    await UserService.changePassword(req.user!.userId, {
      currentPassword: oldPassword,
      newPassword
    });

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
    await UserService.deactivateAccount(req.user!.userId);

    const response: ApiResponse = {
      success: true,
      message: 'Account deactivated successfully'
    };

    res.status(200).json(response);
  });
}
