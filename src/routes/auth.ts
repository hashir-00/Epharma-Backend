import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication management
 */

// User authentication routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Admin authentication routes
router.post('/admin/login', AuthController.adminLogin);

// Pharmacy authentication routes
router.post('/pharmacy/login', AuthController.pharmacyLogin);

export default router;
