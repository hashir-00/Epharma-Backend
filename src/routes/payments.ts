import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing
 */

// All payment routes require user authentication
router.use(authenticate);
router.use(authorize(UserRole.USER));

// Payment routes
router.post('/process', PaymentController.processPayment);
router.get('/status/:orderId', PaymentController.getPaymentStatus);
router.post('/refund', PaymentController.processRefund);

export default router;
