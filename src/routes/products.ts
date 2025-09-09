import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

// Public routes (no authentication required)
router.get('/categories', ProductController.getCategories);
router.get('/pharmacies', ProductController.getPharmacies);
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);
router.get('/pharmacy/:pharmacyId', ProductController.getProductsByPharmacy);

// Protected routes (require authentication)
router.use(authenticate);

// Pharmacy-only routes
router.post('/', authorize(UserRole.PHARMACY), ProductController.createProduct);
router.put('/:id', authorize(UserRole.PHARMACY), ProductController.updateProduct);
router.delete('/:id', authorize(UserRole.PHARMACY), ProductController.deleteProduct);

export default router;
