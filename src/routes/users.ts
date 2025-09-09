import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

// All user routes require authentication
router.use(authenticate);
router.use(authorize(UserRole.USER));

// User profile routes
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);

// Password management
router.post('/change-password', UserController.changePassword);

// Account management
router.post('/deactivate', UserController.deactivateAccount);

export default router;
