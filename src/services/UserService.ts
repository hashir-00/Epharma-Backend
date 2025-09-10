import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AuthUtils } from '../utils/auth';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@/types';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string
  dateOfBirth?: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  role:UserRole;
  age?: number;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  age: number;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export class UserService {
  static async getUserProfile(userId: string): Promise<UserProfile> {
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({
      where: { id: userId },
          });

    if (!user) {
      throw new AppError('User not found', 404);
    }

   
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role:user.role,
      age: user.age
    };
  }

  static async updateUserProfile(userId: string, updateData: UpdateProfileData): Promise<UserProfile> {
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { firstName, lastName, phone, address, age } = updateData;

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (age) user.age = age;
    // Validate updated user data
    const errors = await validate(user);
    if (errors.length > 0) {
      const validationErrors = errors.map(error => ({
        property: error.property,
        constraints: error.constraints
      }));
      logger.error('User profile validation failed:', validationErrors);
      throw new AppError(`Validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`, 400);
    }

    await userRepository.save(user);

    logger.info(`User profile updated: ${user.email}`);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
        role:user.role
    };
  }

  static async changePassword(userId: string, passwordData: ChangePasswordData): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    
    const { currentPassword, newPassword } = passwordData;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters long', 400);
    }

    const user = await userRepository.findOne({ where: { id: userId } });
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
  }

  static async deactivateAccount(userId: string): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.isActive = false;
    await userRepository.save(user);

    logger.info(`Account deactivated for user: ${user.email}`);
  }
}
