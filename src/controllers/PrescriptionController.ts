import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Prescription } from '../entities/Prescription';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, PaginationQuery, PrescriptionStatus } from '../types';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import path from 'path';

/**
 * @swagger
 * components:
 *   schemas:
 *     PrescriptionResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         fileName:
 *           type: string
 *         originalName:
 *           type: string
 *         fileSize:
 *           type: integer
 *         mimeType:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         adminNotes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export class PrescriptionController {
  /**
   * @swagger
   * /prescriptions/upload:
   *   post:
   *     summary: Upload prescription file
   *     tags: [Prescriptions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               prescription:
   *                 type: string
   *                 format: binary
   *     responses:
   *       201:
   *         description: Prescription uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/PrescriptionResponse'
   */
  static uploadPrescription = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    const userRepository = AppDataSource.getRepository(User);

    // Check if file was uploaded
    if (!req.file) {
      throw new AppError('Prescription file is required', 400);
    }

    // Verify user exists
    const user = await userRepository.findOne({ where: { id: req.user!.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const prescription = new Prescription();
    prescription.userId = user.id;
    prescription.fileName = req.file.filename;
    prescription.filePath = req.file.path;
    prescription.originalName = req.file.originalname;
    prescription.fileSize = req.file.size;
    prescription.mimeType = req.file.mimetype;
    prescription.status = PrescriptionStatus.PENDING;

    // Validate prescription data
    const errors = await validate(prescription);
    if (errors.length > 0) {
      throw new AppError('Validation failed', 400);
    }

    await prescriptionRepository.save(prescription);

    logger.info(`Prescription uploaded by user ${user.email}: ${prescription.fileName}`);

    const response: ApiResponse = {
      success: true,
      data: {
        id: prescription.id,
        fileName: prescription.fileName,
        originalName: prescription.originalName,
        fileSize: prescription.fileSize,
        mimeType: prescription.mimeType,
        status: prescription.status,
        createdAt: prescription.createdAt
      },
      message: 'Prescription uploaded successfully'
    };

    res.status(201).json(response);
  });

  /**
   * @swagger
   * /prescriptions:
   *   get:
   *     summary: Get user's prescriptions
   *     tags: [Prescriptions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *         description: Number of items per page
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, approved, rejected]
   *         description: Filter by status
   *     responses:
   *       200:
   *         description: Prescriptions retrieved successfully
   */
  static getUserPrescriptions = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    
    const { page = 1, limit = 20, status } = req.query as PaginationQuery & { status?: PrescriptionStatus };
    const offset = (page - 1) * limit;

    const whereClause: any = { userId: req.user!.userId };
    if (status) {
      whereClause.status = status;
    }

    const [prescriptions, total] = await prescriptionRepository.findAndCount({
      where: whereClause,
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
      select: ['id', 'fileName', 'originalName', 'fileSize', 'mimeType', 'status', 'adminNotes', 'createdAt', 'updatedAt']
    });

    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse = {
      success: true,
      data: prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /prescriptions/{id}:
   *   get:
   *     summary: Get prescription by ID
   *     tags: [Prescriptions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Prescription retrieved successfully
   *       404:
   *         description: Prescription not found
   */
  static getPrescriptionById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    
    const prescription = await prescriptionRepository.findOne({
      where: { 
        id: req.params.id,
        userId: req.user!.userId
      },
      select: ['id', 'fileName', 'originalName', 'fileSize', 'mimeType', 'status', 'adminNotes', 'createdAt', 'updatedAt']
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: prescription,
      message: 'Prescription retrieved successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /prescriptions/{id}/download:
   *   get:
   *     summary: Download prescription file
   *     tags: [Prescriptions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: File downloaded successfully
   *       404:
   *         description: Prescription not found
   */
  static downloadPrescription = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    
    const prescription = await prescriptionRepository.findOne({
      where: { 
        id: req.params.id,
        userId: req.user!.userId
      }
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${prescription.originalName}"`);
    res.setHeader('Content-Type', prescription.mimeType);

    // Send the file
    res.sendFile(path.resolve(prescription.filePath));
  });

  /**
   * @swagger
   * /prescriptions/{id}:
   *   delete:
   *     summary: Delete prescription
   *     tags: [Prescriptions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Prescription deleted successfully
   *       404:
   *         description: Prescription not found
   */
  static deletePrescription = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    
    const prescription = await prescriptionRepository.findOne({
      where: { 
        id: req.params.id,
        userId: req.user!.userId
      }
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    // Only allow deletion if prescription is pending or rejected
    if (prescription.status === PrescriptionStatus.APPROVED) {
      throw new AppError('Cannot delete approved prescription', 400);
    }

    await prescriptionRepository.remove(prescription);

    // TODO: Delete the actual file from storage

    logger.info(`Prescription deleted by user: ${prescription.fileName}`);

    const response: ApiResponse = {
      success: true,
      message: 'Prescription deleted successfully'
    };

    res.status(200).json(response);
  });
}
