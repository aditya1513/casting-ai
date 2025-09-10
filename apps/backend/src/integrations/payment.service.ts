/**
 * Mumbai Market Payment Gateway Integration
 * Supporting Indian payment methods: UPI, Cards, Net Banking, Wallets
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import crypto from 'crypto';
import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';

export interface PaymentOrder {
  id: string;
  amount: number; // In paisa (1 INR = 100 paisa)
  currency: 'INR';
  receipt: string;
  notes?: Record<string, any>;
  status: 'created' | 'attempted' | 'paid' | 'failed' | 'cancelled';
  created_at: number;
  attempts: number;
}

export interface PaymentMethod {
  type: 'card' | 'netbanking' | 'wallet' | 'upi' | 'emi' | 'paylater';
  card?: {
    name: string;
    last4: string;
    network: string; // visa, mastercard, rupay
    type: string;    // debit, credit
    issuer?: string;
  };
  bank?: string;
  wallet?: 'paytm' | 'phonepe' | 'googlepay' | 'amazonpay' | 'mobikwik' | 'freecharge';
  upi?: {
    vpa: string; // Virtual Payment Address like user@paytm
  };
  emi?: {
    duration: number;
    rate: number;
  };
}

export interface PaymentCapture {
  amount: number;
  currency: 'INR';
  notes?: Record<string, any>;
}

export interface PaymentRefund {
  id: string;
  payment_id: string;
  amount: number;
  currency: 'INR';
  notes?: Record<string, any>;
  receipt?: string;
  acquirer_data?: Record<string, any>;
  status: 'queued' | 'pending' | 'processed' | 'failed';
  speed_requested: 'normal' | 'optimum';
  speed_processed: 'normal' | 'instant';
  created_at: number;
}

export interface PaymentWebhook {
  entity: string;
  account_id: string;
  event: 'payment.authorized' | 'payment.captured' | 'payment.failed' | 'order.paid' | 'refund.created' | 'refund.processed';
  contains: string[];
  payload: {
    payment?: {
      entity: PaymentOrder & {
        method: string;
        amount_refunded: number;
        refund_status?: string;
        captured: boolean;
        description?: string;
        card_id?: string;
        bank?: string;
        wallet?: string;
        vpa?: string;
        email: string;
        contact: string;
        fee?: number;
        tax?: number;
        error_code?: string;
        error_description?: string;
        error_source?: string;
        error_step?: string;
        error_reason?: string;
      };
    };
    order?: PaymentOrder;
    refund?: PaymentRefund;
  };
  created_at: number;
}

export interface CastingPayment {
  type: 'audition_fee' | 'premium_membership' | 'portfolio_boost' | 'training_course' | 'headshot_session';
  amount: number;
  currency: 'INR';
  userId: string;
  userEmail: string;
  userPhone: string;
  description: string;
  metadata?: {
    projectId?: string;
    packageId?: string;
    discountCode?: string;
    taxAmount?: number;
    baseAmount?: number;
  };
}

// Indian payment service providers
type PaymentProvider = 'razorpay' | 'paytm' | 'cashfree' | 'instamojo' | 'ccavenue';

export class PaymentService {
  private razorpayInstance: AxiosInstance | null = null;
  private paytmInstance: AxiosInstance | null = null;
  private redis: Redis;
  private paymentQueue: Queue<any>;
  private refundQueue: Queue<any>;
  
  // Environment configuration
  private razorpayKeyId: string;
  private razorpayKeySecret: string;
  private paytmMerchantId: string;
  private paytmMerchantKey: string;
  private webhookSecret: string;
  
  private isRazorpayEnabled: boolean = false;
  private isPaytmEnabled: boolean = false;

  constructor() {
    // Initialize configuration
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
    this.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.paytmMerchantId = process.env.PAYTM_MERCHANT_ID || '';
    this.paytmMerchantKey = process.env.PAYTM_MERCHANT_KEY || '';
    this.webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || '';

    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      maxRetriesPerRequest: 3,
    });

    // Initialize queues
    this.paymentQueue = new Bull('payment-processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    this.refundQueue = new Bull('refund-processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      },
    });

    this.initialize();
    this.processQueues();
  }

  private async initialize(): Promise<void> {
    // Initialize Razorpay
    if (this.razorpayKeyId && this.razorpayKeySecret) {
      this.razorpayInstance = axios.create({
        baseURL: 'https://api.razorpay.com/v1',
        auth: {
          username: this.razorpayKeyId,
          password: this.razorpayKeySecret,
        },
        timeout: 30000,
      });
      this.isRazorpayEnabled = true;
      logger.info('Razorpay payment gateway initialized for Mumbai market');
    }

    // Initialize Paytm
    if (this.paytmMerchantId && this.paytmMerchantKey) {
      this.paytmInstance = axios.create({
        baseURL: 'https://securegw.paytm.in',
        timeout: 30000,
      });
      this.isPaytmEnabled = true;
      logger.info('Paytm payment gateway initialized for Mumbai market');
    }

    if (!this.isRazorpayEnabled && !this.isPaytmEnabled) {
      logger.warn('No payment gateways configured. Payments will be simulated.');
    }
  }

  private processQueues(): void {
    // Process payment queue
    this.paymentQueue.process(async (job: Job) => {
      const { type, data } = job.data;
      
      switch (type) {
        case 'capture_payment':
          return await this.processCapturePayment(data);
        case 'verify_payment':
          return await this.processVerifyPayment(data);
        case 'send_payment_confirmation':
          return await this.processSendConfirmation(data);
        default:
          throw new Error(`Unknown payment job type: ${type}`);
      }
    });

    // Process refund queue
    this.refundQueue.process(async (job: Job) => {
      const { refundData } = job.data;
      return await this.processRefund(refundData);
    });
  }

  /**
   * Create payment order for casting services
   */
  async createPaymentOrder(payment: CastingPayment): Promise<PaymentOrder> {
    try {
      // Validate Indian mobile number
      if (!this.isValidIndianPhoneNumber(payment.userPhone)) {
        throw new AppError('Invalid Indian mobile number', 400);
      }

      // Create order with primary payment provider (Razorpay)
      if (this.isRazorpayEnabled && this.razorpayInstance) {
        return await this.createRazorpayOrder(payment);
      }
      
      // Fallback to Paytm
      if (this.isPaytmEnabled && this.paytmInstance) {
        return await this.createPaytmOrder(payment);
      }

      // Simulate order creation for testing
      return await this.simulateOrderCreation(payment);
      
    } catch (error: any) {
      logger.error('Payment order creation failed:', error);
      throw new AppError(`Payment order creation failed: ${error.message}`, error.status || 500);
    }
  }

  private async createRazorpayOrder(payment: CastingPayment): Promise<PaymentOrder> {
    const orderData = {
      amount: payment.amount, // Amount in paisa
      currency: 'INR',
      receipt: `castmatch_${Date.now()}_${payment.userId}`,
      notes: {
        user_id: payment.userId,
        user_email: payment.userEmail,
        user_phone: payment.userPhone,
        payment_type: payment.type,
        project_id: payment.metadata?.projectId,
        package_id: payment.metadata?.packageId,
        discount_code: payment.metadata?.discountCode,
      },
    };

    const response = await this.razorpayInstance!.post('/orders', orderData);
    const order = response.data;

    // Store order in cache
    await this.redis.setex(
      `payment:order:${order.id}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify({
        ...order,
        provider: 'razorpay',
        user_id: payment.userId,
        payment_type: payment.type,
      })
    );

    logger.info(`Razorpay order created: ${order.id} for user: ${payment.userId}`);
    return order;
  }

  private async createPaytmOrder(payment: CastingPayment): Promise<PaymentOrder> {
    const orderId = `CASTMATCH_${Date.now()}_${payment.userId}`;
    
    const paytmParams = {
      MID: this.paytmMerchantId,
      ORDER_ID: orderId,
      CUST_ID: payment.userId,
      TXN_AMOUNT: (payment.amount / 100).toString(), // Convert paisa to rupees
      CHANNEL_ID: 'WEB',
      INDUSTRY_TYPE_ID: 'Retail',
      WEBSITE: 'DEFAULT',
      EMAIL: payment.userEmail,
      MOBILE_NO: payment.userPhone,
      CALLBACK_URL: `${process.env.API_URL}/api/payments/paytm/callback`,
    };

    // Generate Paytm checksum
    const checksum = this.generatePaytmChecksum(paytmParams);
    paytmParams['CHECKSUMHASH'] = checksum;

    // Create transaction token
    const tokenResponse = await this.paytmInstance!.post('/theia/api/v1/initiateTransaction', {
      body: {
        requestType: 'Payment',
        mid: this.paytmMerchantId,
        websiteName: 'DEFAULT',
        orderId,
        txnAmount: {
          value: (payment.amount / 100).toString(),
          currency: 'INR',
        },
        userInfo: {
          custId: payment.userId,
          email: payment.userEmail,
          mobile: payment.userPhone,
        },
        callbackUrl: `${process.env.API_URL}/api/payments/paytm/callback`,
      },
      head: {
        signature: checksum,
      },
    });

    const order: PaymentOrder = {
      id: orderId,
      amount: payment.amount,
      currency: 'INR',
      receipt: orderId,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
      attempts: 0,
      notes: {
        user_id: payment.userId,
        payment_type: payment.type,
        txn_token: tokenResponse.data.body.txnToken,
      },
    };

    // Store order in cache
    await this.redis.setex(
      `payment:order:${orderId}`,
      24 * 60 * 60,
      JSON.stringify({
        ...order,
        provider: 'paytm',
        user_id: payment.userId,
        payment_type: payment.type,
      })
    );

    logger.info(`Paytm order created: ${orderId} for user: ${payment.userId}`);
    return order;
  }

  private async simulateOrderCreation(payment: CastingPayment): Promise<PaymentOrder> {
    const orderId = `SIM_${Date.now()}_${payment.userId}`;
    
    const order: PaymentOrder = {
      id: orderId,
      amount: payment.amount,
      currency: 'INR',
      receipt: orderId,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
      attempts: 0,
      notes: {
        user_id: payment.userId,
        payment_type: payment.type,
        simulated: true,
      },
    };

    logger.info(`Simulated payment order created: ${orderId}`);
    return order;
  }

  /**
   * Verify payment signature (for Razorpay)
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    try {
      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(body)
        .digest('hex');
      
      return expectedSignature === signature;
    } catch (error) {
      logger.error('Payment signature verification failed:', error);
      return false;
    }
  }

  /**
   * Capture payment after successful authorization
   */
  async capturePayment(paymentId: string, amount: number): Promise<any> {
    if (!this.isRazorpayEnabled || !this.razorpayInstance) {
      throw new AppError('Razorpay not configured', 500);
    }

    try {
      const response = await this.razorpayInstance.post(
        `/payments/${paymentId}/capture`,
        { amount, currency: 'INR' }
      );

      // Queue follow-up actions
      await this.paymentQueue.add('send_payment_confirmation', {
        paymentId,
        amount,
      });

      logger.info(`Payment captured: ${paymentId}, amount: ₹${amount / 100}`);
      return response.data;
    } catch (error: any) {
      logger.error('Payment capture failed:', error);
      throw new AppError('Payment capture failed', error.response?.status || 500);
    }
  }

  /**
   * Create refund for payment
   */
  async createRefund(
    paymentId: string,
    amount: number,
    notes?: Record<string, any>
  ): Promise<PaymentRefund> {
    if (!this.isRazorpayEnabled || !this.razorpayInstance) {
      throw new AppError('Razorpay not configured', 500);
    }

    try {
      const refundData = {
        amount,
        notes: {
          reason: 'Refund requested by user',
          processed_by: 'system',
          ...notes,
        },
      };

      const response = await this.razorpayInstance.post(
        `/payments/${paymentId}/refund`,
        refundData
      );

      const refund = response.data;

      // Store refund information
      await this.redis.setex(
        `payment:refund:${refund.id}`,
        30 * 24 * 60 * 60, // 30 days
        JSON.stringify(refund)
      );

      // Queue refund processing
      await this.refundQueue.add('process_refund', { refundData: refund });

      logger.info(`Refund created: ${refund.id} for payment: ${paymentId}`);
      return refund;
    } catch (error: any) {
      logger.error('Refund creation failed:', error);
      throw new AppError('Refund creation failed', error.response?.status || 500);
    }
  }

  /**
   * Handle payment webhooks from various providers
   */
  async handleWebhook(
    provider: PaymentProvider,
    signature: string,
    payload: any
  ): Promise<void> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(provider, signature, payload)) {
        throw new AppError('Invalid webhook signature', 401);
      }

      switch (provider) {
        case 'razorpay':
          await this.handleRazorpayWebhook(payload);
          break;
        case 'paytm':
          await this.handlePaytmWebhook(payload);
          break;
        default:
          logger.warn(`Unsupported payment provider webhook: ${provider}`);
      }
    } catch (error) {
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  private async handleRazorpayWebhook(payload: PaymentWebhook): Promise<void> {
    const { event, payload: data } = payload;

    switch (event) {
      case 'payment.authorized':
        await this.handlePaymentAuthorized(data.payment!);
        break;
      case 'payment.captured':
        await this.handlePaymentCaptured(data.payment!);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(data.payment!);
        break;
      case 'order.paid':
        await this.handleOrderPaid(data.order!);
        break;
      case 'refund.created':
        await this.handleRefundCreated(data.refund!);
        break;
      case 'refund.processed':
        await this.handleRefundProcessed(data.refund!);
        break;
      default:
        logger.info(`Unhandled Razorpay webhook event: ${event}`);
    }
  }

  private async handlePaytmWebhook(payload: any): Promise<void> {
    // Handle Paytm-specific webhook events
    const { STATUS, ORDERID, TXNID, TXNAMOUNT } = payload;
    
    if (STATUS === 'TXN_SUCCESS') {
      await this.handlePaytmPaymentSuccess({
        orderId: ORDERID,
        txnId: TXNID,
        amount: parseFloat(TXNAMOUNT) * 100, // Convert to paisa
      });
    } else if (STATUS === 'TXN_FAILURE') {
      await this.handlePaytmPaymentFailure({
        orderId: ORDERID,
        txnId: TXNID,
        failureReason: payload.RESPCODE,
      });
    }
  }

  /**
   * Get payment analytics for Mumbai market
   */
  async getPaymentAnalytics(days: number = 30): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
    popularPaymentMethods: Array<{ method: string; count: number; percentage: number }>;
    revenueByType: Array<{ type: string; amount: number; percentage: number }>;
    failureReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      const keys = await this.redis.keys('payment:completed:*');
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      let totalTransactions = 0;
      let totalAmount = 0;
      let successfulTransactions = 0;
      const paymentMethods: Record<string, number> = {};
      const revenueByType: Record<string, number> = {};
      const failureReasons: Record<string, number> = {};

      for (const key of keys) {
        const timestamp = parseInt(key.split(':')[2]);
        if (timestamp < cutoff) continue;

        const data = await this.redis.get(key);
        if (!data) continue;

        const payment = JSON.parse(data);
        totalTransactions++;

        if (payment.status === 'captured' || payment.status === 'paid') {
          successfulTransactions++;
          totalAmount += payment.amount;
          
          // Track payment methods
          paymentMethods[payment.method] = (paymentMethods[payment.method] || 0) + 1;
          
          // Track revenue by type
          const paymentType = payment.notes?.payment_type || 'unknown';
          revenueByType[paymentType] = (revenueByType[paymentType] || 0) + payment.amount;
        } else if (payment.status === 'failed') {
          const reason = payment.error_description || 'Unknown error';
          failureReasons[reason] = (failureReasons[reason] || 0) + 1;
        }
      }

      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

      // Convert to arrays and calculate percentages
      const popularPaymentMethods = Object.entries(paymentMethods)
        .map(([method, count]) => ({
          method,
          count,
          percentage: (count / successfulTransactions) * 100
        }))
        .sort((a, b) => b.count - a.count);

      const revenueByTypeArray = Object.entries(revenueByType)
        .map(([type, amount]) => ({
          type,
          amount,
          percentage: (amount / totalAmount) * 100
        }))
        .sort((a, b) => b.amount - a.amount);

      const failureReasonsArray = Object.entries(failureReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

      return {
        totalTransactions,
        totalAmount,
        successRate,
        popularPaymentMethods,
        revenueByType: revenueByTypeArray,
        failureReasons: failureReasonsArray,
      };
    } catch (error) {
      logger.error('Failed to get payment analytics:', error);
      throw new AppError('Failed to get payment analytics', 500);
    }
  }

  // Helper methods
  private verifyWebhookSignature(
    provider: PaymentProvider,
    signature: string,
    payload: any
  ): boolean {
    try {
      switch (provider) {
        case 'razorpay':
          const expectedSignature = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');
          return expectedSignature === signature;
        
        case 'paytm':
          // Paytm webhook verification logic
          return this.verifyPaytmChecksum(payload, signature);
        
        default:
          return false;
      }
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  private generatePaytmChecksum(params: Record<string, string>): string {
    // Implement Paytm checksum generation
    // This is a simplified version - use official Paytm SDK for production
    const sortedKeys = Object.keys(params).sort();
    const queryString = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return crypto
      .createHash('sha256')
      .update(queryString + this.paytmMerchantKey)
      .digest('hex');
  }

  private verifyPaytmChecksum(params: any, checksum: string): boolean {
    // Implement Paytm checksum verification
    const { CHECKSUMHASH, ...otherParams } = params;
    const generatedChecksum = this.generatePaytmChecksum(otherParams);
    return generatedChecksum === checksum;
  }

  private isValidIndianPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return /^91[6-9]\d{9}$/.test(cleaned);
    }
    if (cleaned.length === 10) {
      return /^[6-9]\d{9}$/.test(cleaned);
    }
    return false;
  }

  // Webhook event handlers
  private async handlePaymentAuthorized(payment: any): Promise<void> {
    logger.info(`Payment authorized: ${payment.id}`);
    // Update database, send notifications, etc.
  }

  private async handlePaymentCaptured(payment: any): Promise<void> {
    logger.info(`Payment captured: ${payment.id}`);
    // Update database, send confirmation, etc.
    await this.redis.setex(
      `payment:completed:${payment.created_at}:${payment.id}`,
      30 * 24 * 60 * 60,
      JSON.stringify(payment)
    );
  }

  private async handlePaymentFailed(payment: any): Promise<void> {
    logger.info(`Payment failed: ${payment.id}, reason: ${payment.error_description}`);
    // Update database, send failure notification, etc.
  }

  private async handleOrderPaid(order: any): Promise<void> {
    logger.info(`Order paid: ${order.id}`);
    // Update order status, provision services, etc.
  }

  private async handleRefundCreated(refund: any): Promise<void> {
    logger.info(`Refund created: ${refund.id}`);
    // Update database, send notification, etc.
  }

  private async handleRefundProcessed(refund: any): Promise<void> {
    logger.info(`Refund processed: ${refund.id}`);
    // Update database, send confirmation, etc.
  }

  private async handlePaytmPaymentSuccess(data: any): Promise<void> {
    logger.info(`Paytm payment success: ${data.orderId}`);
    // Handle successful Paytm payment
  }

  private async handlePaytmPaymentFailure(data: any): Promise<void> {
    logger.info(`Paytm payment failed: ${data.orderId}, reason: ${data.failureReason}`);
    // Handle failed Paytm payment
  }

  // Queue processors
  private async processCapturePayment(data: any): Promise<any> {
    return await this.capturePayment(data.paymentId, data.amount);
  }

  private async processVerifyPayment(data: any): Promise<any> {
    return this.verifyPaymentSignature(data.orderId, data.paymentId, data.signature);
  }

  private async processSendConfirmation(data: any): Promise<void> {
    logger.info(`Sending payment confirmation for: ${data.paymentId}`);
    // Send email/SMS confirmation
  }

  private async processRefund(refundData: any): Promise<void> {
    logger.info(`Processing refund: ${refundData.id}`);
    // Handle refund processing
  }
}

// Export singleton instance
export const paymentService = new PaymentService();