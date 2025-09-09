import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import productRoutes from './products';
import prescriptionRoutes from './prescriptions';
import orderRoutes from './orders';
import adminRoutes from './admin';
import paymentRoutes from './payments';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'EPharmacy API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/auth',
      users: '/users',
      products: '/products',
      prescriptions: '/prescriptions',
      orders: '/orders',
      admin: '/admin',
      payments: '/payments'
    },
    documentation: '/api-docs'
  });
});

export default router;
