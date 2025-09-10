import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { PaymentService } from '../services/PaymentService';

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentRequest:
 *       type: object
 *       required:
 *         - orderId
 *         - paymentMethod
 *         - amount
 *       properties:
 *         orderId:
 *           type: string
 *           format: uuid
 *         paymentMethod:
 *           type: string
 *           enum: [credit_card, debit_card, paypal, bank_transfer]
 *         amount:
 *           type: number
 *           minimum: 0
 *         cardDetails:
 *           type: object
 *           properties:
 *             cardNumber:
 *               type: string
 *             expiryMonth:
 *               type: string
 *             expiryYear:
 *               type: string
 *             cvv:
 *               type: string
 *             cardHolderName:
 *               type: string
 */

export class PaymentController {
  /**
   * @swagger
   * /payments/process:
   *   post:
   *     summary: Process payment (Dummy implementation for MVP)
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PaymentRequest'
   *     responses:
   *       200:
   *         description: Payment processed successfully
   *       400:
   *         description: Payment failed
   */
  static processPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { orderId, paymentMethod, amount, cardDetails } = req.body;

    const paymentData = {
      orderId,
      paymentMethod,
      amount,
      cardDetails
    };

    const result = await PaymentService.processPayment(req.user!.userId, paymentData);

    const response: ApiResponse = {
      success: result.success,
      data: {
        orderId,
        paymentStatus: result.status,
        transactionId: result.transactionId,
        amount: result.amount
      },
      message: result.message
    };

    res.status(result.success ? 200 : 400).json(response);
  });

  /**
   * @swagger
   * /payments/status/{orderId}:
   *   get:
   *     summary: Get payment status for an order
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Payment status retrieved successfully
   */
  static getPaymentStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const paymentStatus = await PaymentService.getPaymentStatus(req.params.orderId, req.user!.userId);

    const response: ApiResponse = {
      success: true,
      data: paymentStatus,
      message: 'Payment status retrieved successfully'
    };

    res.status(200).json(response);
  });

  /**
   * @swagger
   * /payments/refund:
   *   post:
   *     summary: Process refund (Dummy implementation)
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - orderId
   *               - reason
   *             properties:
   *               orderId:
   *                 type: string
   *                 format: uuid
   *               reason:
   *                 type: string
   *               amount:
   *                 type: number
   *                 minimum: 0
   *     responses:
   *       200:
   *         description: Refund processed successfully
   */
  static processRefund = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { orderId, reason, amount } = req.body;

    const refundData = {
      orderId,
      reason,
      amount
    };

    const result = await PaymentService.processRefund(req.user!.userId, refundData);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Refund processed successfully'
    };

    res.status(200).json(response);
  });

}
