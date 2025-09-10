import { AppDataSource } from '../config/database';
import { Prescription } from '../entities/Prescription';
import { User } from '../entities/User';
import { PrescriptionStatus } from '../types';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface UploadPrescriptionData {
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
}

export interface PaginatedPrescriptions {
  prescriptions: Prescription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class PrescriptionService {
  static async uploadPrescription(userId: string, fileData: UploadPrescriptionData): Promise<Prescription> {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    const userRepository = AppDataSource.getRepository(User);

    // Verify user exists
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { originalName, fileName, fileSize, mimeType, filePath } = fileData;

    // Validate file data
    if (!originalName || !fileName || !fileSize || !mimeType || !filePath) {
      throw new AppError('All file data is required', 400);
    }

    // Validate file type (should be image or PDF)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf'
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new AppError('Invalid file type. Only JPEG, PNG, and PDF files are allowed', 400);
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxFileSize) {
      throw new AppError('File size too large. Maximum 10MB allowed', 400);
    }

    // Create prescription record
    const prescription = new Prescription();
    prescription.userId = userId;
    prescription.originalName = originalName;
    prescription.fileName = fileName;
    prescription.fileSize = fileSize;
    prescription.mimeType = mimeType;
    prescription.filePath = filePath;
    prescription.status = PrescriptionStatus.PENDING;

    // Validate prescription data
    const errors = await validate(prescription);
    if (errors.length > 0) {
      const validationErrors = errors.map(error => ({
        property: error.property,
        constraints: error.constraints
      }));
      logger.error('Prescription validation failed:', validationErrors);
      throw new AppError(`Validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`, 400);
    }

    const savedPrescription = await prescriptionRepository.save(prescription);

    logger.info(`Prescription uploaded by user ${user.email}: ${savedPrescription.id}`);

    return savedPrescription;
  }

  static async getUserPrescriptions(
    userId: string, 
    page: number = 1, 
    limit: number = 10, 
    status?: PrescriptionStatus
  ): Promise<PaginatedPrescriptions> {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    const offset = (page - 1) * limit;

    const whereClause: any = { userId };
    if (status) {
      whereClause.status = status;
    }

    const [prescriptions, total] = await prescriptionRepository.findAndCount({
      where: whereClause,
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        originalName: true,
        fileSize: true,
        mimeType: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true
      }
    });

    const totalPages = Math.ceil(total / limit);

    return {
      prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async getPrescriptionById(userId: string, prescriptionId: string): Promise<Prescription> {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);

    const prescription = await prescriptionRepository.findOne({
      where: { id: prescriptionId, userId },
      relations: ['user'],
      select: {
        id: true,
        originalName: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        filePath: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        user: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    return prescription;
  }

  static async getPrescriptionFile(userId: string, prescriptionId: string): Promise<{ filePath: string; mimeType: string; originalName: string }> {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);

    const prescription = await prescriptionRepository.findOne({
      where: { id: prescriptionId, userId },
      select: ['filePath', 'mimeType', 'originalName']
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    return {
      filePath: prescription.filePath,
      mimeType: prescription.mimeType,
      originalName: prescription.originalName
    };
  }

  static async deletePrescription(userId: string, prescriptionId: string): Promise<void> {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);

    const prescription = await prescriptionRepository.findOne({
      where: { id: prescriptionId, userId }
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    // Only allow deletion of pending prescriptions
    if (prescription.status !== PrescriptionStatus.PENDING) {
      throw new AppError('Only pending prescriptions can be deleted', 400);
    }

    await prescriptionRepository.remove(prescription);

    logger.info(`Prescription deleted: ${prescriptionId}`);
  }

  // Admin methods
  static async getAllPrescriptions(
    page: number = 1, 
    limit: number = 20, 
    status?: PrescriptionStatus
  ): Promise<PaginatedPrescriptions> {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [prescriptions, total] = await prescriptionRepository.findAndCount({
      where: whereClause,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        originalName: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        user: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    });

    const totalPages = Math.ceil(total / limit);

    return {
      prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async reviewPrescription(
    prescriptionId: string, 
    status: PrescriptionStatus, 
    adminNotes?: string, 
    adminId?: string
  ): Promise<void> {
    const prescriptionRepository = AppDataSource.getRepository(Prescription);

    if (!status || ![PrescriptionStatus.APPROVED, PrescriptionStatus.REJECTED].includes(status)) {
      throw new AppError('Valid status (approved/rejected) is required', 400);
    }

    const prescription = await prescriptionRepository.findOne({
      where: { id: prescriptionId },
      relations: ['user']
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    if (prescription.status !== PrescriptionStatus.PENDING) {
      throw new AppError('Prescription has already been reviewed', 400);
    }

    prescription.status = status;
    if (adminNotes) {
      prescription.adminNotes = adminNotes;
    }
    if (adminId) {
      prescription.approvedBy = adminId;
    }
    prescription.approvedAt = new Date();

    await prescriptionRepository.save(prescription);

    logger.info(`Prescription ${status} by admin: ${prescription.id}`);
  }
}
