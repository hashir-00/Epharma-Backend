import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Admin } from '../entities/Admin';
import { Pharmacy } from '../entities/Pharmacy';
import { Product } from '../entities/Product';
import { AuthUtils } from '../utils/auth';
import { ProductStatus } from '../types';
import { logger } from '../utils/logger';

async function createSampleData() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected successfully');

    const userRepository = AppDataSource.getRepository(User);
    const adminRepository = AppDataSource.getRepository(Admin);
    const pharmacyRepository = AppDataSource.getRepository(Pharmacy);
    const productRepository = AppDataSource.getRepository(Product);

    // Create sample admin
    const admin = new Admin();
    admin.firstName = 'Admin';
    admin.lastName = 'User';
    admin.email = 'admin@epharmacy.com';
    admin.password = await AuthUtils.hashPassword('admin123');
    admin.role = 'admin';
    await adminRepository.save(admin);
    logger.info('Sample admin created: admin@epharmacy.com / admin123');

    // Create sample users
    const users = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'user123',
        phone: '1234567890',
        address: '123 Main St, City, State 12345'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: 'user123',
        phone: '0987654321',
        address: '456 Oak Ave, City, State 67890'
      }
    ];

    for (const userData of users) {
      const user = new User();
      user.firstName = userData.firstName;
      user.lastName = userData.lastName;
      user.email = userData.email;
      user.password = await AuthUtils.hashPassword(userData.password);
      user.phone = userData.phone;
      user.address = userData.address;
      await userRepository.save(user);
      logger.info(`Sample user created: ${userData.email} / user123`);
    }

    // Create sample pharmacies
    const pharmacies = [
      {
        name: 'City Pharmacy',
        email: 'city@pharmacy.com',
        password: 'pharmacy123',
        phone: '555-0101',
        address: '789 Health St, Medical District, City 11111',
        licenseNumber: 'PH001',
        isVerified: true,
        latitude: 40.7128,
        longitude: -74.0060
      },
      {
        name: 'MediCare Plus',
        email: 'medicare@plus.com',
        password: 'pharmacy123',
        phone: '555-0202',
        address: '321 Wellness Blvd, Health City, State 22222',
        licenseNumber: 'PH002',
        isVerified: true,
        latitude: 34.0522,
        longitude: -118.2437
      }
    ];

    const createdPharmacies = [];
    for (const pharmacyData of pharmacies) {
      const pharmacy = new Pharmacy();
      pharmacy.name = pharmacyData.name;
      pharmacy.email = pharmacyData.email;
      pharmacy.password = await AuthUtils.hashPassword(pharmacyData.password);
      pharmacy.phone = pharmacyData.phone;
      pharmacy.address = pharmacyData.address;
      pharmacy.licenseNumber = pharmacyData.licenseNumber;
      pharmacy.isVerified = pharmacyData.isVerified;
      pharmacy.latitude = pharmacyData.latitude;
      pharmacy.longitude = pharmacyData.longitude;
      const savedPharmacy = await pharmacyRepository.save(pharmacy);
      createdPharmacies.push(savedPharmacy);
      logger.info(`Sample pharmacy created: ${pharmacyData.email} / pharmacy123`);
    }

    // Create sample products
    const products = [
      {
        name: 'Acetaminophen 500mg',
        description: 'Pain reliever and fever reducer. Over-the-counter medication.',
        price: 9.99,
        stockQuantity: 100,
        category: 'Pain Relief',
        requiresPrescription: false,
        pharmacyId: createdPharmacies[0].id
      },
      {
        name: 'Amoxicillin 250mg',
        description: 'Antibiotic medication for bacterial infections. Prescription required.',
        price: 15.50,
        stockQuantity: 50,
        category: 'Antibiotics',
        requiresPrescription: true,
        pharmacyId: createdPharmacies[0].id
      },
      {
        name: 'Vitamin D3 1000 IU',
        description: 'Essential vitamin for bone health and immune function.',
        price: 12.99,
        stockQuantity: 75,
        category: 'Vitamins',
        requiresPrescription: false,
        pharmacyId: createdPharmacies[1].id
      },
      {
        name: 'Metformin 500mg',
        description: 'Diabetes medication for blood sugar control. Prescription required.',
        price: 25.00,
        stockQuantity: 30,
        category: 'Diabetes',
        requiresPrescription: true,
        pharmacyId: createdPharmacies[1].id
      },
      {
        name: 'Ibuprofen 200mg',
        description: 'Non-steroidal anti-inflammatory drug (NSAID) for pain and inflammation.',
        price: 8.99,
        stockQuantity: 120,
        category: 'Pain Relief',
        requiresPrescription: false,
        pharmacyId: createdPharmacies[0].id
      }
    ];

    for (const productData of products) {
      const product = new Product();
      product.name = productData.name;
      product.description = productData.description;
      product.price = productData.price;
      product.stockQuantity = productData.stockQuantity;
      product.category = productData.category;
      product.requiresPrescription = productData.requiresPrescription;
      product.pharmacyId = productData.pharmacyId;
      product.status = ProductStatus.ACTIVE;
      await productRepository.save(product);
      logger.info(`Sample product created: ${productData.name}`);
    }

    logger.info('Sample data creation completed successfully!');
    logger.info('\n=== LOGIN CREDENTIALS ===');
    logger.info('Admin: admin@epharmacy.com / admin123');
    logger.info('Users: john.doe@example.com / user123, jane.smith@example.com / user123');
    logger.info('Pharmacies: city@pharmacy.com / pharmacy123, medicare@plus.com / pharmacy123');
    logger.info('========================\n');

  } catch (error) {
    logger.error('Error creating sample data:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
createSampleData();
