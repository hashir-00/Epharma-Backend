import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management
 */

// All admin routes require admin authentication
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// Dashboard and analytics
router.get('/dashboard', AdminController.getDashboard);

// User management
router.get('/users', AdminController.getUsers);
router.post('/users/:id/toggle-status', AdminController.toggleUserStatus);

// Pharmacy management
router.get('/pharmacies', AdminController.getPharmacies);
router.post('/pharmacies/:id/verify', AdminController.verifyPharmacy);

// Prescription management
router.get('/prescriptions', AdminController.getPrescriptions);
router.post('/prescriptions/:id/review', AdminController.reviewPrescription);

// Product management
router.get('/products', AdminController.getProducts);
router.post('/products/:id/approve', AdminController.approveProduct);
router.post('/products/:id/reject', AdminController.rejectProduct);

export default router;
