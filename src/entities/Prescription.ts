import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { User } from './User';
import { PrescriptionStatus } from '../types';

@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  @IsNotEmpty()
  fileName: string;

  @Column()
  @IsNotEmpty()
  filePath: string;

  @Column({ nullable: true })
  originalName: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column()
  mimeType: string;

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.PENDING
  })
  status: PrescriptionStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @ManyToOne(() => User, user => user.prescriptions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
