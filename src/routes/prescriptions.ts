import { Router } from 'express';
import { PrescriptionController } from '../controllers/PrescriptionController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import { uploadPrescription } from '../utils/fileUpload';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Prescriptions
 *   description: Prescription management
 */

// All prescription routes require user authentication
router.use(authenticate);
router.use(authorize(UserRole.USER));

// Prescription routes
router.post('/upload', uploadPrescription, PrescriptionController.uploadPrescription);
router.get('/', PrescriptionController.getUserPrescriptions);
router.get('/:id', PrescriptionController.getPrescriptionById);
router.get('/:id/download', PrescriptionController.downloadPrescription);
router.delete('/:id', PrescriptionController.deletePrescription);

export default router;
