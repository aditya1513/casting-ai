/**
 * Payment Gateway Integration Service
 * Handles Razorpay, Stripe, PayPal, and Indian payment methods (UPI, Paytm)
 * with subscription management, invoicing, and refund handling
 */

import Razorpay from 'razorpay';
import Stripe from 'stripe';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { CacheManager, CacheKeys } from '../../config/redis';
import Bull, { Queue, Job } from 'bull';
import { format } from 'date-fns';

interface PaymentOptions {
  amount: number; // In smallest currency unit (paise for INR, cents for USD)
  currency: 'INR' | 'USD' | 'EUR';
  description?: string;
  customer: {
    id?: string;
    email: string;
    name: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
  receipt?: string;
  notes?: Record<string, string>;
}

interface SubscriptionOptions {
  planId: string;
  customerId: string;
  trialDays?: number;
  quantity?: number;
  addons?: Array<{
    itemId: string;
    quantity: number;
  }>;
  metadata?: Record<string, any>;
  startAt?: Date;
  totalCount?: number;
  customNotify?: boolean;
}

interface RefundOptions {
  paymentId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
  notes?: Record<string, string>;
  speed?: 'normal' | 'optimum';
}

interface PaymentMethod {
  type: 'card' | 'upi' | 'netbanking' | 'wallet' | 'bank_transfer';
  details: Record<string, any>;
}

interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  dueDate: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
  }>;
  taxAmount?: number;
  discountAmount?: number;
}

interface WebhookEvent {
  id: string;
  event: string;
  payload: any;
  signature: string;
  timestamp: number;
}

export class PaymentGatewayService {
  private razorpay: Razorpay | null = null;
  private stripe: Stripe | null = null;
  private paymentQueue: Queue;
  private refundQueue: Queue;
  private invoiceQueue: Queue;
  private webhookQueue: Queue;
  private readonly provider: 'razorpay' | 'stripe';
  private readonly webhookSecret: string;

  constructor() {
    // Determine primary provider based on region
    this.provider = process.env.PAYMENT_PROVIDER === 'stripe' ? 'stripe' : 'razorpay';
    this.webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || '';
    
    this.initializePaymentProviders();
    this.initializeQueues();
  }

  /**
   * Initialize payment providers
   */
  private initializePaymentProviders(): void {
    // Initialize Razorpay (primary for India)
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      logger.info('Razorpay initialized successfully');
    }

    // Initialize Stripe (for international payments)
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
        typescript: true,
      });
      logger.info('Stripe initialized successfully');
    }
  }

  /**
   * Initialize processing queues
   */
  private initializeQueues(): void {
    const redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    };

    this.paymentQueue = new Bull('payment-processing-queue', redisConfig);
    this.refundQueue = new Bull('refund-processing-queue', redisConfig);
    this.invoiceQueue = new Bull('invoice-generation-queue', redisConfig);
    this.webhookQueue = new Bull('payment-webhook-queue', redisConfig);

    // Process payment queue
    this.paymentQueue.process(async (job: Job) => {
      const { provider, options } = job.data;
      try {
        const result = await this.processPaymentInternal(provider, options);
        return { success: true, paymentId: result.id };
      } catch (error) {
        logger.error('Payment processing failed', { error, jobId: job.id });
        throw error;
      }
    });

    // Process refund queue
    this.refundQueue.process(async (job: Job) => {
      const { provider, options } = job.data;
      try {
        const result = await this.processRefundInternal(provider, options);
        return { success: true, refundId: result.id };
      } catch (error) {
        logger.error('Refund processing failed', { error, jobId: job.id });
        throw error;
      }
    });

    // Process invoice queue
    this.invoiceQueue.process(async (job: Job) => {
      const { invoice } = job.data;
      try {
        const result = await this.generateInvoiceInternal(invoice);
        return { success: true, invoiceId: result.id };
      } catch (error) {
        logger.error('Invoice generation failed', { error, jobId: job.id });
        throw error;
      }
    });

    // Process webhook queue
    this.webhookQueue.process(async (job: Job) => {
      const { event } = job.data;
      try {
        await this.handleWebhookEventInternal(event);
        return { success: true, eventId: event.id };
      } catch (error) {
        logger.error('Webhook processing failed', { error, jobId: job.id });
        throw error;
      }
    });
  }

  /**
   * Create payment order/intent
   */
  async createPayment(options: PaymentOptions): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
  }> {
    try {
      if (this.provider === 'razorpay' && this.razorpay) {
        return await this.createRazorpayPayment(options);
      } else if (this.stripe) {
        return await this.createStripePayment(options);
      } else {
        throw new Error('No payment provider available');
      }
    } catch (error) {
      logger.error('Failed to create payment', { options, error });
      throw error;
    }
  }

  /**
   * Create Razorpay order
   */
  private async createRazorpayPayment(options: PaymentOptions): Promise<any> {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    const order = await this.razorpay.orders.create({
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt || `receipt_${Date.now()}`,
      notes: {
        ...options.notes,
        customer_email: options.customer.email,
        customer_name: options.customer.name,
      },
    });

    // Cache order details
    await CacheManager.set(
      CacheKeys.paymentOrder(order.id),
      {
        ...order,
        customer: options.customer,
        metadata: options.metadata,
      },
      3600 // 1 hour
    );

    logger.info('Razorpay order created', { orderId: order.id });

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      provider: 'razorpay',
    };
  }

  /**
   * Create Stripe payment intent
   */
  private async createStripePayment(options: PaymentOptions): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    // Create or retrieve customer
    let customerId = options.customer.id;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: options.customer.email,
        name: options.customer.name,
        phone: options.customer.phone,
      });
      customerId = customer.id;
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: options.amount,
      currency: options.currency.toLowerCase(),
      customer: customerId,
      description: options.description,
      metadata: options.metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Cache payment intent details
    await CacheManager.set(
      CacheKeys.paymentOrder(paymentIntent.id),
      {
        ...paymentIntent,
        customer: options.customer,
      },
      3600 // 1 hour
    );

    logger.info('Stripe payment intent created', { intentId: paymentIntent.id });

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      status: paymentIntent.status,
      provider: 'stripe',
    };
  }

  /**
   * Verify payment
   */
  async verifyPayment(
    paymentId: string,
    signature?: string
  ): Promise<{
    verified: boolean;
    status: string;
    amount?: number;
    error?: string;
  }> {
    try {
      if (this.provider === 'razorpay' && signature) {
        return await this.verifyRazorpayPayment(paymentId, signature);
      } else if (this.stripe) {
        return await this.verifyStripePayment(paymentId);
      } else {
        throw new Error('No payment provider available');
      }
    } catch (error) {
      logger.error('Payment verification failed', { paymentId, error });
      return {
        verified: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  private async verifyRazorpayPayment(
    paymentId: string,
    signature: string
  ): Promise<any> {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    // Get order details from cache
    const orderDetails = await CacheManager.get(CacheKeys.paymentOrder(paymentId));
    
    if (!orderDetails) {
      throw new Error('Order details not found');
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderDetails.id}|${paymentId}`)
      .digest('hex');

    const verified = expectedSignature === signature;

    if (verified) {
      // Fetch payment details
      const payment = await this.razorpay.payments.fetch(paymentId);
      
      return {
        verified: true,
        status: payment.status,
        amount: payment.amount,
      };
    } else {
      return {
        verified: false,
        status: 'failed',
        error: 'Invalid signature',
      };
    }
  }

  /**
   * Verify Stripe payment
   */
  private async verifyStripePayment(paymentId: string): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

    return {
      verified: paymentIntent.status === 'succeeded',
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    };
  }

  /**
   * Create subscription
   */
  async createSubscription(options: SubscriptionOptions): Promise<{
    id: string;
    status: string;
    currentPeriodEnd: Date;
    provider: string;
  }> {
    try {
      if (this.provider === 'razorpay' && this.razorpay) {
        return await this.createRazorpaySubscription(options);
      } else if (this.stripe) {
        return await this.createStripeSubscription(options);
      } else {
        throw new Error('No payment provider available');
      }
    } catch (error) {
      logger.error('Failed to create subscription', { options, error });
      throw error;
    }
  }

  /**
   * Create Razorpay subscription
   */
  private async createRazorpaySubscription(options: SubscriptionOptions): Promise<any> {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    const subscription = await this.razorpay.subscriptions.create({
      plan_id: options.planId,
      customer_id: options.customerId,
      quantity: options.quantity || 1,
      total_count: options.totalCount,
      start_at: options.startAt ? Math.floor(options.startAt.getTime() / 1000) : undefined,
      addons: options.addons?.map(addon => ({
        item: {
          item_id: addon.itemId,
          quantity: addon.quantity,
        },
      })),
      notes: options.metadata,
      notify_customer: options.customNotify ?? true,
    });

    logger.info('Razorpay subscription created', { subscriptionId: subscription.id });

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_end * 1000),
      provider: 'razorpay',
    };
  }

  /**
   * Create Stripe subscription
   */
  private async createStripeSubscription(options: SubscriptionOptions): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: options.customerId,
      items: [
        {
          price: options.planId,
          quantity: options.quantity || 1,
        },
      ],
      trial_period_days: options.trialDays,
      metadata: options.metadata || {},
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    logger.info('Stripe subscription created', { subscriptionId: subscription.id });

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      provider: 'stripe',
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediate: boolean = false
  ): Promise<{
    id: string;
    status: string;
    cancelledAt: Date;
  }> {
    try {
      if (this.provider === 'razorpay' && this.razorpay) {
        return await this.cancelRazorpaySubscription(subscriptionId, immediate);
      } else if (this.stripe) {
        return await this.cancelStripeSubscription(subscriptionId, immediate);
      } else {
        throw new Error('No payment provider available');
      }
    } catch (error) {
      logger.error('Failed to cancel subscription', { subscriptionId, error });
      throw error;
    }
  }

  /**
   * Cancel Razorpay subscription
   */
  private async cancelRazorpaySubscription(
    subscriptionId: string,
    immediate: boolean
  ): Promise<any> {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    const subscription = await this.razorpay.subscriptions.cancel(subscriptionId, {
      cancel_at_cycle_end: !immediate,
    });

    logger.info('Razorpay subscription cancelled', { subscriptionId });

    return {
      id: subscription.id,
      status: subscription.status,
      cancelledAt: new Date(subscription.ended_at * 1000),
    };
  }

  /**
   * Cancel Stripe subscription
   */
  private async cancelStripeSubscription(
    subscriptionId: string,
    immediate: boolean
  ): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !immediate,
    });

    if (immediate) {
      await this.stripe.subscriptions.cancel(subscriptionId);
    }

    logger.info('Stripe subscription cancelled', { subscriptionId });

    return {
      id: subscription.id,
      status: subscription.status,
      cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : new Date(),
    };
  }

  /**
   * Process refund
   */
  async processRefund(options: RefundOptions): Promise<{
    id: string;
    amount: number;
    status: string;
    provider: string;
  }> {
    // Add to refund queue for processing
    const job = await this.refundQueue.add(
      {
        provider: this.provider,
        options,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    const result = await job.finished();
    return result;
  }

  /**
   * Process refund internally
   */
  private async processRefundInternal(
    provider: 'razorpay' | 'stripe',
    options: RefundOptions
  ): Promise<any> {
    if (provider === 'razorpay' && this.razorpay) {
      return await this.processRazorpayRefund(options);
    } else if (this.stripe) {
      return await this.processStripeRefund(options);
    } else {
      throw new Error('No payment provider available');
    }
  }

  /**
   * Process Razorpay refund
   */
  private async processRazorpayRefund(options: RefundOptions): Promise<any> {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    const refund = await this.razorpay.payments.refund(options.paymentId, {
      amount: options.amount,
      speed: options.speed || 'normal',
      notes: options.notes,
    });

    logger.info('Razorpay refund processed', { refundId: refund.id });

    return {
      id: refund.id,
      amount: refund.amount,
      status: refund.status,
      provider: 'razorpay',
    };
  }

  /**
   * Process Stripe refund
   */
  private async processStripeRefund(options: RefundOptions): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const refund = await this.stripe.refunds.create({
      payment_intent: options.paymentId,
      amount: options.amount,
      reason: this.mapRefundReason(options.reason),
      metadata: options.notes,
    });

    logger.info('Stripe refund processed', { refundId: refund.id });

    return {
      id: refund.id,
      amount: refund.amount,
      status: refund.status || 'pending',
      provider: 'stripe',
    };
  }

  /**
   * Map refund reason to Stripe format
   */
  private mapRefundReason(reason?: string): 'duplicate' | 'fraudulent' | 'requested_by_customer' | undefined {
    switch (reason?.toLowerCase()) {
      case 'duplicate': return 'duplicate';
      case 'fraud': return 'fraudulent';
      case 'customer': return 'requested_by_customer';
      default: return undefined;
    }
  }

  /**
   * Generate invoice
   */
  async generateInvoice(invoice: Invoice): Promise<{
    id: string;
    url?: string;
    pdfUrl?: string;
  }> {
    // Add to invoice queue for processing
    const job = await this.invoiceQueue.add(
      { invoice },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    const result = await job.finished();
    return result;
  }

  /**
   * Generate invoice internally
   */
  private async generateInvoiceInternal(invoice: Invoice): Promise<any> {
    try {
      if (this.provider === 'razorpay' && this.razorpay) {
        return await this.generateRazorpayInvoice(invoice);
      } else if (this.stripe) {
        return await this.generateStripeInvoice(invoice);
      } else {
        throw new Error('No payment provider available');
      }
    } catch (error) {
      logger.error('Invoice generation failed', { invoice, error });
      throw error;
    }
  }

  /**
   * Generate Razorpay invoice
   */
  private async generateRazorpayInvoice(invoice: Invoice): Promise<any> {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    const razorpayInvoice = await this.razorpay.invoices.create({
      customer_id: invoice.customerId,
      amount: invoice.amount,
      currency: invoice.currency,
      description: `Invoice for ${invoice.items[0]?.description}`,
      line_items: invoice.items.map(item => ({
        item_id: crypto.randomBytes(16).toString('hex'),
        name: item.description,
        amount: item.unitAmount,
        quantity: item.quantity,
      })),
      expire_by: Math.floor(invoice.dueDate.getTime() / 1000),
      notes: {
        tax_amount: invoice.taxAmount?.toString(),
        discount_amount: invoice.discountAmount?.toString(),
      },
    });

    logger.info('Razorpay invoice generated', { invoiceId: razorpayInvoice.id });

    return {
      id: razorpayInvoice.id,
      url: razorpayInvoice.short_url,
      pdfUrl: razorpayInvoice.pdf_url,
    };
  }

  /**
   * Generate Stripe invoice
   */
  private async generateStripeInvoice(invoice: Invoice): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    // Create invoice items
    for (const item of invoice.items) {
      await this.stripe.invoiceItems.create({
        customer: invoice.customerId,
        amount: item.unitAmount * item.quantity,
        currency: invoice.currency.toLowerCase(),
        description: item.description,
      });
    }

    // Create invoice
    const stripeInvoice = await this.stripe.invoices.create({
      customer: invoice.customerId,
      due_date: Math.floor(invoice.dueDate.getTime() / 1000),
      auto_advance: true,
    });

    // Finalize invoice
    await this.stripe.invoices.finalizeInvoice(stripeInvoice.id);

    logger.info('Stripe invoice generated', { invoiceId: stripeInvoice.id });

    return {
      id: stripeInvoice.id,
      url: stripeInvoice.hosted_invoice_url,
      pdfUrl: stripeInvoice.invoice_pdf,
    };
  }

  /**
   * Handle payment webhook
   */
  async handleWebhook(
    body: any,
    signature: string,
    provider?: 'razorpay' | 'stripe'
  ): Promise<void> {
    try {
      const event: WebhookEvent = {
        id: crypto.randomBytes(16).toString('hex'),
        event: body.event || body.type,
        payload: body,
        signature,
        timestamp: Date.now(),
      };

      // Add to webhook queue for processing
      await this.webhookQueue.add(
        { event, provider: provider || this.provider },
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        }
      );

      logger.info('Webhook queued for processing', { eventId: event.id, eventType: event.event });
    } catch (error) {
      logger.error('Failed to queue webhook', { body, error });
      throw error;
    }
  }

  /**
   * Handle webhook event internally
   */
  private async handleWebhookEventInternal(event: WebhookEvent): Promise<void> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(event)) {
        throw new Error('Invalid webhook signature');
      }

      // Process based on event type
      switch (event.event) {
        case 'payment.captured':
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.payload);
          break;
          
        case 'payment.failed':
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.payload);
          break;
          
        case 'subscription.created':
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.payload);
          break;
          
        case 'subscription.cancelled':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.payload);
          break;
          
        case 'refund.created':
        case 'charge.refunded':
          await this.handleRefundCreated(event.payload);
          break;
          
        case 'invoice.paid':
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaid(event.payload);
          break;
          
        default:
          logger.warn('Unhandled webhook event', { eventType: event.event });
      }

      // Store webhook event for audit
      await CacheManager.set(
        CacheKeys.webhookEvent(event.id),
        event,
        86400 * 7 // 7 days
      );

    } catch (error) {
      logger.error('Webhook processing failed', { event, error });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(event: WebhookEvent): boolean {
    if (this.provider === 'razorpay') {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(event.payload))
        .digest('hex');
      return expectedSignature === event.signature;
    } else if (this.provider === 'stripe' && this.stripe) {
      try {
        this.stripe.webhooks.constructEvent(
          JSON.stringify(event.payload),
          event.signature,
          this.webhookSecret
        );
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Handle payment success
   */
  private async handlePaymentSuccess(payload: any): Promise<void> {
    logger.info('Payment successful', { paymentId: payload.id });
    
    // Update database
    // Send confirmation email
    // Trigger post-payment workflows
    
    const { emailService } = await import('../../services/email.service');
    
    if (payload.customer_email) {
      await emailService.sendEmail({
        to: payload.customer_email,
        subject: 'Payment Successful - CastMatch',
        html: this.generatePaymentSuccessEmail(payload),
        text: `Your payment of ${payload.amount / 100} ${payload.currency} has been processed successfully.`,
      });
    }
  }

  /**
   * Handle payment failure
   */
  private async handlePaymentFailure(payload: any): Promise<void> {
    logger.error('Payment failed', { paymentId: payload.id, reason: payload.failure_reason });
    
    // Update database
    // Send failure notification
    // Trigger retry workflows
    
    const { emailService } = await import('../../services/email.service');
    
    if (payload.customer_email) {
      await emailService.sendEmail({
        to: payload.customer_email,
        subject: 'Payment Failed - CastMatch',
        html: this.generatePaymentFailureEmail(payload),
        text: `Your payment could not be processed. Please try again or use a different payment method.`,
      });
    }
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(payload: any): Promise<void> {
    logger.info('Subscription created', { subscriptionId: payload.id });
    
    // Update user subscription status
    // Send welcome email
    // Provision access
  }

  /**
   * Handle subscription cancelled
   */
  private async handleSubscriptionCancelled(payload: any): Promise<void> {
    logger.info('Subscription cancelled', { subscriptionId: payload.id });
    
    // Update user subscription status
    // Send cancellation email
    // Revoke access after period end
  }

  /**
   * Handle refund created
   */
  private async handleRefundCreated(payload: any): Promise<void> {
    logger.info('Refund created', { refundId: payload.id });
    
    // Update payment status
    // Send refund confirmation
    // Update accounting records
  }

  /**
   * Handle invoice paid
   */
  private async handleInvoicePaid(payload: any): Promise<void> {
    logger.info('Invoice paid', { invoiceId: payload.id });
    
    // Update invoice status
    // Send receipt
    // Update subscription if applicable
  }

  /**
   * Setup UPI payment (India specific)
   */
  async setupUPIPayment(
    amount: number,
    upiId: string,
    description?: string
  ): Promise<{
    qrCode: string;
    deepLink: string;
    transactionId: string;
  }> {
    try {
      const transactionId = crypto.randomBytes(16).toString('hex');
      
      // Generate UPI payment string
      const upiString = `upi://pay?pa=${upiId}&pn=CastMatch&am=${amount / 100}&cu=INR&tn=${description || 'CastMatch Payment'}&tr=${transactionId}`;
      
      // Generate QR code
      const QRCode = require('qrcode');
      const qrCode = await QRCode.toDataURL(upiString);
      
      // Cache transaction details
      await CacheManager.set(
        CacheKeys.upiTransaction(transactionId),
        {
          amount,
          upiId,
          description,
          status: 'pending',
          createdAt: new Date(),
        },
        600 // 10 minutes
      );
      
      logger.info('UPI payment setup', { transactionId, amount });
      
      return {
        qrCode,
        deepLink: upiString,
        transactionId,
      };
    } catch (error) {
      logger.error('Failed to setup UPI payment', { amount, upiId, error });
      throw error;
    }
  }

  /**
   * Setup Paytm payment (India specific)
   */
  async setupPaytmPayment(
    amount: number,
    mobile: string,
    email: string,
    orderId: string
  ): Promise<{
    transactionToken: string;
    orderId: string;
    redirectUrl: string;
  }> {
    try {
      const paytmParams: any = {
        body: {
          requestType: 'Payment',
          mid: process.env.PAYTM_MID,
          websiteName: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
          orderId: orderId,
          callbackUrl: `${process.env.API_BASE_URL}/payments/paytm/callback`,
          txnAmount: {
            value: (amount / 100).toFixed(2),
            currency: 'INR',
          },
          userInfo: {
            custId: crypto.createHash('md5').update(email).digest('hex'),
            mobile: mobile,
            email: email,
          },
        },
      };

      // Generate checksum
      const PaytmChecksum = require('paytmchecksum');
      const checksum = await PaytmChecksum.generateSignature(
        JSON.stringify(paytmParams.body),
        process.env.PAYTM_MERCHANT_KEY
      );
      
      paytmParams.head = {
        signature: checksum,
      };

      // Initialize transaction
      const response = await axios.post(
        `https://${process.env.PAYTM_HOST}/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
        paytmParams
      );

      logger.info('Paytm payment initialized', { orderId, amount });

      return {
        transactionToken: response.data.body.txnToken,
        orderId: orderId,
        redirectUrl: `https://${process.env.PAYTM_HOST}/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
      };
    } catch (error) {
      logger.error('Failed to setup Paytm payment', { amount, mobile, error });
      throw error;
    }
  }

  /**
   * Generate payment success email
   */
  private generatePaymentSuccessEmail(payment: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Successful</h2>
        <p>Your payment has been processed successfully.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> ${(payment.amount / 100).toFixed(2)} ${payment.currency}</p>
          <p><strong>Payment ID:</strong> ${payment.id}</p>
          <p><strong>Date:</strong> ${format(new Date(), 'PPpp')}</p>
        </div>
        <p>Thank you for your payment!</p>
      </div>
    `;
  }

  /**
   * Generate payment failure email
   */
  private generatePaymentFailureEmail(payment: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Failed</h2>
        <p>Unfortunately, your payment could not be processed.</p>
        <div style="background: #fff3e0; border: 1px solid #ff9800; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> ${(payment.amount / 100).toFixed(2)} ${payment.currency}</p>
          <p><strong>Reason:</strong> ${payment.failure_reason || 'Transaction declined'}</p>
        </div>
        <p>Please try again with a different payment method or contact support if the issue persists.</p>
      </div>
    `;
  }

  /**
   * Get payment methods for customer
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      if (this.provider === 'razorpay' && this.razorpay) {
        // Razorpay doesn't store payment methods directly
        return [];
      } else if (this.stripe) {
        const paymentMethods = await this.stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
        });

        return paymentMethods.data.map(method => ({
          type: 'card' as const,
          details: {
            brand: method.card?.brand,
            last4: method.card?.last4,
            expMonth: method.card?.exp_month,
            expYear: method.card?.exp_year,
          },
        }));
      }
      return [];
    } catch (error) {
      logger.error('Failed to get payment methods', { customerId, error });
      return [];
    }
  }

  /**
   * Create payment link
   */
  async createPaymentLink(
    amount: number,
    description: string,
    customerEmail?: string
  ): Promise<{
    url: string;
    id: string;
    expiresAt?: Date;
  }> {
    try {
      if (this.provider === 'razorpay' && this.razorpay) {
        const link = await this.razorpay.paymentLink.create({
          amount: amount,
          currency: 'INR',
          description: description,
          customer: customerEmail ? {
            email: customerEmail,
          } : undefined,
          notify: {
            email: true,
            sms: false,
          },
          callback_url: `${process.env.FRONTEND_URL}/payment/success`,
          callback_method: 'get',
        });

        return {
          url: link.short_url,
          id: link.id,
          expiresAt: link.expire_by ? new Date(link.expire_by * 1000) : undefined,
        };
      } else if (this.stripe) {
        const paymentLink = await this.stripe.paymentLinks.create({
          line_items: [
            {
              price_data: {
                currency: 'inr',
                product_data: {
                  name: description,
                },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
        });

        return {
          url: paymentLink.url,
          id: paymentLink.id,
        };
      } else {
        throw new Error('No payment provider available');
      }
    } catch (error) {
      logger.error('Failed to create payment link', { amount, description, error });
      throw error;
    }
  }
}

// Cache keys for payment data
declare module '../../config/redis' {
  interface CacheKeysInterface {
    paymentOrder(orderId: string): string;
    upiTransaction(transactionId: string): string;
    webhookEvent(eventId: string): string;
  }
}

// Extend CacheKeys
const originalCacheKeys = CacheKeys as any;
originalCacheKeys.paymentOrder = (orderId: string) => `payment:order:${orderId}`;
originalCacheKeys.upiTransaction = (transactionId: string) => `payment:upi:${transactionId}`;
originalCacheKeys.webhookEvent = (eventId: string) => `webhook:event:${eventId}`;

export const paymentGatewayService = new PaymentGatewayService();