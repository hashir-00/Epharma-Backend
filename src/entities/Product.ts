import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { IsNotEmpty, IsPositive, Min } from 'class-validator';
import { Pharmacy } from './Pharmacy';

import { ProductStatus } from '../types';
import { OrderItem } from './OrderItem';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsPositive()
  price: number;

  @Column({ type: 'int' })
  @Min(0)
  stockQuantity: number;

  @Column()
  category: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: false })
  requiresPrescription: boolean;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.PENDING_APPROVAL
  })
  status: ProductStatus;

  @Column('uuid')
  pharmacyId: string;

  @ManyToOne(() => Pharmacy, pharmacy => pharmacy.products)
  @JoinColumn({ name: 'pharmacyId' })
  pharmacy: Pharmacy;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems: OrderItem[];
}
