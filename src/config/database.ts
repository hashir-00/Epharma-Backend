import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import dotenv from 'dotenv';
import { Pharmacy } from '../entities/Pharmacy';
import { Product } from '../entities/Product';
import { Prescription } from '../entities/Prescription';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'epharma_db',
  synchronize: process.env.NODE_ENV === 'development', // Only in development
  logging: process.env.DB_LOGGING === 'development',
  entities: [User, Pharmacy, Product, Prescription, Order, OrderItem],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});
