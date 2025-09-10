import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderStatus } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface PaymentData {
  orderId: string;
  paymentMethod: 'card' | 'bank_transfer' | 'mobile_money';
  amount: number;
  currency?: string;
  paymentDetails?: {
    cardNumber?: string;
    cardExpiry?: string;
    cardCVC?: string;
    bankAccount?: string;
    phoneNumber?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  paymentMethod: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  message: string;
}

export interface RefundData {
  orderId: string;
  reason: string;
  amount?: number; // If not provided, full amount will be refunded
}

export class PaymentService {
  static async processPayment(userId: string, paymentData: PaymentData): Promise<PaymentResult> {
    const orderRepository = AppDataSource.getRepository(Order);

    const { orderId, paymentMethod, amount, currency = 'USD', paymentDetails } = paymentData;

    // Validate order
    const order = await orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['user']
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new AppError('Order is not in a payable state', 400);
    }

    // Validate payment amount
    if (amount !== order.totalAmount) {
      throw new AppError('Payment amount does not match order total', 400);
    }

    // Validate payment method and details
    if (!this.validatePaymentMethod(paymentMethod, paymentDetails)) {
      throw new AppError('Invalid payment method or missing payment details', 400);
    }

    try {
      // Process payment based on method
      let paymentResult: PaymentResult;

      switch (paymentMethod) {
        case 'card':
          paymentResult = await this.processCardPayment(order, paymentDetails);
          break;
        case 'bank_transfer':
          paymentResult = await this.processBankTransfer(order, paymentDetails);
          break;
        case 'mobile_money':
          paymentResult = await this.processMobileMoneyPayment(order, paymentDetails);
          break;
        default:
          throw new AppError('Unsupported payment method', 400);
      }

      // Update order status based on payment result
      if (paymentResult.success && paymentResult.status === 'completed') {
        order.status = OrderStatus.APPROVED;
        await orderRepository.save(order);

        logger.info(`Payment completed for order ${orderId}: ${paymentResult.transactionId}`);
      } else if (paymentResult.status === 'pending') {
        // Keep as PENDING for now since we don't have PAYMENT_PENDING status
        order.status = OrderStatus.PENDING;
        await orderRepository.save(order);

        logger.info(`Payment pending for order ${orderId}: ${paymentResult.transactionId}`);
      }

      return paymentResult;

    } catch (error) {
      logger.error(`Payment failed for order ${orderId}:`, error);
      
      return {
        success: false,
        transactionId: '',
        paymentMethod,
        amount,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  static async getPaymentStatus(userId: string, orderId: string): Promise<{
    orderId: string;
    paymentStatus: string;
    transactionId?: string;
    amount: number;
    orderStatus: OrderStatus;
  }> {
    const orderRepository = AppDataSource.getRepository(Order);

    const order = await orderRepository.findOne({
      where: { id: orderId, userId },
      select: ['id', 'totalAmount', 'status']
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Map order status to payment status
    let paymentStatus: string;
    switch (order.status) {
      case OrderStatus.PENDING:
        paymentStatus = 'not_paid';
        break;
      case OrderStatus.APPROVED:
      case OrderStatus.SHIPPED:
      case OrderStatus.DELIVERED:
        paymentStatus = 'completed';
        break;
      case OrderStatus.CANCELLED:
        paymentStatus = 'cancelled';
        break;
      default:
        paymentStatus = 'unknown';
    }

    return {
      orderId: order.id,
      paymentStatus,
      amount: order.totalAmount,
      orderStatus: order.status
    };
  }

  static async processRefund(userId: string, refundData: RefundData): Promise<{
    success: boolean;
    refundId: string;
    amount: number;
    message: string;
  }> {
    const orderRepository = AppDataSource.getRepository(Order);

    const { orderId, reason, amount } = refundData;

    // Validate order
    const order = await orderRepository.findOne({
      where: { id: orderId, userId }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Check if order is eligible for refund
    const eligibleStatuses = [
      OrderStatus.APPROVED,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED
    ];

    if (!eligibleStatuses.includes(order.status)) {
      throw new AppError('Order is not eligible for refund', 400);
    }

    // Validate refund amount
    const refundAmount = amount || order.totalAmount;
    if (refundAmount > order.totalAmount) {
      throw new AppError('Refund amount cannot exceed order total', 400);
    }

    try {
      // Process refund (mock implementation)
      const refundId = this.generateRefundId();
      
      // In a real implementation, you would:
      // 1. Call payment provider's refund API
      // 2. Update payment records
      // 3. Send confirmation emails
      
      // Update order status
      order.status = OrderStatus.CANCELLED;
      await orderRepository.save(order);

      logger.info(`Refund processed for order ${orderId}: ${refundId}, amount: ${refundAmount}, reason: ${reason}`);

      return {
        success: true,
        refundId,
        amount: refundAmount,
        message: 'Refund processed successfully'
      };

    } catch (error) {
      logger.error(`Refund failed for order ${orderId}:`, error);
      
      return {
        success: false,
        refundId: '',
        amount: refundAmount,
        message: error instanceof Error ? error.message : 'Refund processing failed'
      };
    }
  }

  // Private helper methods
  private static validatePaymentMethod(paymentMethod: string, paymentDetails?: any): boolean {
    if (!paymentDetails) return false;

    switch (paymentMethod) {
      case 'card':
        return !!(paymentDetails.cardNumber && paymentDetails.cardExpiry && paymentDetails.cardCVC);
      case 'bank_transfer':
        return !!paymentDetails.bankAccount;
      case 'mobile_money':
        return !!paymentDetails.phoneNumber;
      default:
        return false;
    }
  }

  private static async processCardPayment(order: Order, paymentDetails: any): Promise<PaymentResult> {
    // Mock card payment processing
    // In a real implementation, you would integrate with a payment gateway like Stripe, PayPal, etc.
    
    const { cardNumber, cardExpiry, cardCVC } = paymentDetails;
    
    // Mock validation
    if (cardNumber.length < 13 || !cardExpiry || !cardCVC) {
      throw new Error('Invalid card details');
    }

    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock success (90% success rate)
    const isSuccess = Math.random() > 0.1;
    
    if (!isSuccess) {
      throw new Error('Card payment declined');
    }

    return {
      success: true,
      transactionId: this.generateTransactionId(),
      paymentMethod: 'card',
      amount: order.totalAmount,
      status: 'completed',
      message: 'Card payment processed successfully'
    };
  }

  private static async processBankTransfer(order: Order, paymentDetails: any): Promise<PaymentResult> {
    // Mock bank transfer processing
    const { bankAccount } = paymentDetails;
    
    if (!bankAccount) {
      throw new Error('Bank account details required');
    }

    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      transactionId: this.generateTransactionId(),
      paymentMethod: 'bank_transfer',
      amount: order.totalAmount,
      status: 'pending', // Bank transfers usually take time to confirm
      message: 'Bank transfer initiated successfully'
    };
  }

  private static async processMobileMoneyPayment(order: Order, paymentDetails: any): Promise<PaymentResult> {
    // Mock mobile money processing
    const { phoneNumber } = paymentDetails;
    
    if (!phoneNumber) {
      throw new Error('Phone number required for mobile money payment');
    }

    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock success (95% success rate)
    const isSuccess = Math.random() > 0.05;
    
    if (!isSuccess) {
      throw new Error('Mobile money payment failed');
    }

    return {
      success: true,
      transactionId: this.generateTransactionId(),
      paymentMethod: 'mobile_money',
      amount: order.totalAmount,
      status: 'completed',
      message: 'Mobile money payment processed successfully'
    };
  }

  private static generateTransactionId(): string {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  private static generateRefundId(): string {
    return 'REF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
}
