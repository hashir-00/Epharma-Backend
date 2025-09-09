import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

// All order routes require user authentication
router.use(authenticate);
router.use(authorize(UserRole.USER));

// Order routes
router.post('/', OrderController.createOrder);
router.get('/', OrderController.getUserOrders);
router.get('/:id', OrderController.getOrderById);
router.post('/:id/cancel', OrderController.cancelOrder);
router.get('/:id/track', OrderController.trackOrder);

export default router;
