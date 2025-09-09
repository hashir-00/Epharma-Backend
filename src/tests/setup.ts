import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Admin } from '../entities/Admin';
import { Pharmacy } from '../entities/Pharmacy';
import { Product } from '../entities/Product';
import { Prescription } from '../entities/Prescription';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';

// Test database configuration
export const TestDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  username: process.env.TEST_DB_USERNAME || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
  database: process.env.TEST_DB_NAME || 'epharmacy_test',
  synchronize: true,
  dropSchema: true,
  logging: false,
  entities: [User, Admin, Pharmacy, Product, Prescription, Order, OrderItem],
});

beforeAll(async () => {
  await TestDataSource.initialize();
});

afterAll(async () => {
  await TestDataSource.destroy();
});

beforeEach(async () => {
  // Clean up database before each test
  const entities = TestDataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = TestDataSource.getRepository(entity.name);
    await repository.clear();
  }
});
