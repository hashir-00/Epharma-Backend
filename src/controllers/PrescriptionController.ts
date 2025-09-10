import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, PaginationQuery, PrescriptionStatus } from '../types';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { PrescriptionService } from '../services/PrescriptionService';
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
    // Check if file was uploaded
    if (!req.file) {
      throw new AppError('Prescription file is required', 400);
    }

    const fileData = {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      filePath: req.file.path
    };

    const prescription = await PrescriptionService.uploadPrescription(req.user!.userId, fileData);

    const response: ApiResponse = {
      success: true,
      data: prescription,
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
    const { page = 1, limit = 20, status } = req.query as PaginationQuery & { status?: PrescriptionStatus };
    
    const result = await PrescriptionService.getUserPrescriptions(req.user!.userId, page, limit, status);

    const response: ApiResponse = {
      success: true,
      data: result.prescriptions,
      pagination: result.pagination
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
    const prescription = await PrescriptionService.getPrescriptionById(req.params.id, req.user!.userId);

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
    const prescription = await PrescriptionService.getPrescriptionById(req.params.id, req.user!.userId);

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
    await PrescriptionService.deletePrescription(req.params.id, req.user!.userId);

    const response: ApiResponse = {
      success: true,
      message: 'Prescription deleted successfully'
    };

    res.status(200).json(response);
  });
}
