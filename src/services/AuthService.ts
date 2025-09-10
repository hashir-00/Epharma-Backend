import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Pharmacy } from '../entities/Pharmacy';
import { AuthUtils } from '../utils/auth';
import { UserRole } from '../types';
import { validate } from 'class-validator';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterUserData {
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
}

export interface RegisterPharmacyData {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  licenseNumber: string;
}

export interface RegisterAdminData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export class AuthService {
  static async registerUser(userData: RegisterUserData): Promise<AuthResponse> {
    const userRepository = AppDataSource.getRepository(User);
    
    const { firstName, lastName, name, email, password, phone, address, dateOfBirth } = userData;

    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Handle name field if firstName and lastName are not provided
    let userFirstName = firstName;
    let userLastName = lastName;
    
    if (!firstName && !lastName && name) {
      const nameParts = name.trim().split(' ');
      userFirstName = nameParts[0] || '';
      userLastName = nameParts.slice(1).join(' ') || '';
    }

    // Validate password before hashing
    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    // Validate required fields
    if (!email || !userFirstName) {
      throw new AppError('Email and name are required', 400);
    }

    // Create new user
    const user = new User();
    user.firstName = userFirstName;
    user.lastName = userLastName || '';
    user.email = email;
    user.password = await AuthUtils.hashPassword(password);
    if (phone) {
      user.phone = phone;
    }
    if (address) {
      user.address = address;
    }
    if (dateOfBirth) {
      user.dateOfBirth = new Date(dateOfBirth);
    }

    // Validate user data
    const errors = await validate(user, { skipMissingProperties: true });
    if (errors.length > 0) {
      const validationErrors = errors.map(error => ({
        property: error.property,
        constraints: error.constraints
      }));
      logger.error('User validation failed:', validationErrors);
      throw new AppError(`Validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`, 400);
    }

    await userRepository.save(user);

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: UserRole.USER
    });

    logger.info(`New user registered: ${user.email}`);

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: UserRole.USER,
        isEmailVerified: user.isEmailVerified
      }
    };
  }

  static async registerPharmacy(pharmacyData: RegisterPharmacyData): Promise<AuthResponse> {
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);
    
    const { name, email, password, phone, address, licenseNumber } = pharmacyData;

    // Check if pharmacy already exists
    const existingPharmacy = await pharmacyRepository.findOne({ where: { email } });
    if (existingPharmacy) {
      throw new AppError('Pharmacy with this email already exists', 400);
    }

    // Check for duplicate license number
    const existingLicense = await pharmacyRepository.findOne({ where: { licenseNumber } });
    if (existingLicense) {
      throw new AppError('Pharmacy with this license number already exists', 400);
    }

    // Validate required fields
    if (!name || !email || !password || !phone || !address || !licenseNumber) {
      throw new AppError('All fields are required for pharmacy registration', 400);
    }

    // Validate password
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    // Create new pharmacy
    const pharmacy = new Pharmacy();
    pharmacy.name = name;
    pharmacy.email = email;
    pharmacy.password = await AuthUtils.hashPassword(password);
    pharmacy.phone = phone;
    pharmacy.address = address;
    pharmacy.licenseNumber = licenseNumber;

    // Validate pharmacy data
    const errors = await validate(pharmacy, { skipMissingProperties: true });
    if (errors.length > 0) {
      const validationErrors = errors.map(error => ({
        property: error.property,
        constraints: error.constraints
      }));
      logger.error('Pharmacy validation failed:', validationErrors);
      throw new AppError(`Validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`, 400);
    }

    await pharmacyRepository.save(pharmacy);

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: pharmacy.id,
      email: pharmacy.email,
      role: UserRole.PHARMACY
    });

    logger.info(`New pharmacy registered: ${pharmacy.email}`);

    return {
      token,
      user: {
        id: pharmacy.id,
        firstName: pharmacy.name,
        lastName: '',
        email: pharmacy.email,
        role: UserRole.PHARMACY,
        isEmailVerified: pharmacy.isVerified
      }
    };
  }

  static async registerAdmin(adminData: RegisterAdminData): Promise<AuthResponse> {
    const adminRepository = AppDataSource.getRepository(User);
    
    const { firstName, lastName, email, password } = adminData;

    // Check if admin already exists
    const existingAdmin = await adminRepository.findOne({ where: { email } });
    if (existingAdmin) {
      throw new AppError('Admin with this email already exists', 400);
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      throw new AppError('All fields are required for admin registration', 400);
    }

    // Validate password
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    // Create new admin
    const admin = new User();
    admin.firstName = firstName;
    admin.lastName = lastName;
    admin.email = email;
    admin.password = await AuthUtils.hashPassword(password);
    admin.role = UserRole.ADMIN;

    // Validate admin data
    const errors = await validate(admin, { skipMissingProperties: true });
    if (errors.length > 0) {
      const validationErrors = errors.map(error => ({
        property: error.property,
        constraints: error.constraints
      }));
      logger.error('Admin validation failed:', validationErrors);
      throw new AppError(`Validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`, 400);
    }

    await adminRepository.save(admin);

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: admin.id,
      email: admin.email,
      role: UserRole.ADMIN
    });

    logger.info(`New admin registered: ${admin.email}`);

    return {
      token,
      user: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: UserRole.ADMIN,
        isEmailVerified: true // Admins are considered verified by default
      }
    };
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await AppDataSource.getRepository(User).findOne({ where: { email } });


    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isPasswordValid = await AuthUtils.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if user is active (for users and pharmacies)
    if ('isActive' in user && !user.isActive) {
      throw new AppError('Account has been deactivated', 401);
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    logger.info(`User logged in: ${user.email} as ${user.role}`);

    return {
      token,
      user: {
        id: user.id,
        firstName: 'firstName' in user ? user.firstName : (user as Pharmacy).name,
        lastName: 'lastName' in user ? user.lastName : '',
        email: user.email,
        role:   user.role,
        isEmailVerified: 'isEmailVerified' in user ? user.isEmailVerified : true
      }
    };
  }

  static async requestPasswordReset(email: string): Promise<void> {
    // Check all user types
    const userRepository = AppDataSource.getRepository(User);
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);

    const user = await userRepository.findOne({ where: { email } }) ||
                 await pharmacyRepository.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if email exists or not for security
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // TODO: Implement actual password reset logic (send email, generate reset token, etc.)
    logger.info(`Password reset requested for: ${email}`);
  }

  static async verifyEmail(token: string): Promise<void> {
    // TODO: Implement email verification logic
    logger.info(`Email verification requested with token: ${token}`);
  }
}
