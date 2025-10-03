const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const logger = require('../utils/logger');
const Stripe = require('stripe');

const router = express.Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Record cash payment (admin)
router.post('/cash', [
  body('orderId').isInt(),
  body('amount').isFloat({ min: 0 }),
  body('receivedAmount').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, amount, receivedAmount, change } = req.body;

    const order = await db('orders').where({ id: orderId }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status === 'PAID') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    const trx = await db.transaction();

    try {
      // Record payment
      await trx('payments').insert({
        order_id: orderId,
        payment_type: 'CASH',
        amount,
        transaction_ref: `CASH-${Date.now()}`,
        paid_at: db.raw('CURRENT_TIMESTAMP')
      });

      // Update order payment status
      await trx('orders').where({ id: orderId }).update({
        payment_status: 'PAID',
        status: order.status === 'AWAITING_PAYMENT' ? 'CONFIRMED' : order.status,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

      await trx.commit();

      // Emit real-time event
      const io = req.app.get('io');
      const updatedOrder = await db('orders')
        .join('tables', 'orders.table_id', 'tables.id')
        .select('orders.*', 'tables.table_number')
        .where('orders.id', orderId)
        .first();

      io.to(`branch:${order.branch_id}:kitchen`).emit('order.paid', updatedOrder);

      res.json({
        message: 'Cash payment recorded successfully',
        change: receivedAmount - amount
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Cash payment error:', error);
    res.status(500).json({ error: 'Failed to record cash payment' });
  }
});

// Create Stripe payment intent (for card payments)
router.post('/stripe/create-intent', [
  body('orderId').isInt(),
  body('amount').isFloat({ min: 0 })
], async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, amount } = req.body;

    const order = await db('orders').where({ id: orderId }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status === 'PAID') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mad', // Moroccan Dirham
      metadata: {
        orderId: orderId.toString(),
        orderCode: order.order_code
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    logger.error('Stripe payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm Stripe payment
router.post('/stripe/confirm', [
  body('orderId').isInt(),
  body('paymentIntentId').notEmpty()
], async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, paymentIntentId } = req.body;

    const order = await db('orders').where({ id: orderId }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not succeeded' });
    }

    const trx = await db.transaction();

    try {
      // Record payment
      await trx('payments').insert({
        order_id: orderId,
        payment_type: 'CARD',
        amount: paymentIntent.amount / 100, // Convert back from cents
        transaction_ref: paymentIntent.id,
        paid_at: db.raw('CURRENT_TIMESTAMP')
      });

      // Update order payment status
      await trx('orders').where({ id: orderId }).update({
        payment_status: 'PAID',
        status: order.status === 'AWAITING_PAYMENT' ? 'CONFIRMED' : order.status,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

      await trx.commit();

      // Emit real-time event
      const io = req.app.get('io');
      const updatedOrder = await db('orders')
        .join('tables', 'orders.table_id', 'tables.id')
        .select('orders.*', 'tables.table_number')
        .where('orders.id', orderId)
        .first();

      io.to(`branch:${order.branch_id}:kitchen`).emit('order.paid', updatedOrder);

      res.json({
        message: 'Card payment confirmed successfully',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100
        }
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Stripe payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm card payment' });
  }
});

// Stripe webhook handler
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        logger.info('PaymentIntent succeeded:', paymentIntent.id);
        
        // Update order status if needed
        const orderId = paymentIntent.metadata.orderId;
        if (orderId) {
          await db('orders').where({ id: orderId }).update({
            payment_status: 'PAID',
            updated_at: db.raw('CURRENT_TIMESTAMP')
          });
        }
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        logger.error('PaymentIntent failed:', failedPayment.id);
        break;
      
      default:
        logger.info(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get payments for an order
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const payments = await db('payments')
      .where({ order_id: orderId })
      .orderBy('paid_at', 'desc');

    res.json(payments);
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get all payments (admin)
router.get('/', async (req, res) => {
  try {
    const { branchId, paymentType, limit = 50, offset = 0 } = req.query;
    
    let query = db('payments')
      .join('orders', 'payments.order_id', 'orders.id')
      .join('branches', 'orders.branch_id', 'branches.id')
      .select(
        'payments.*',
        'orders.order_code',
        'orders.customer_name',
        'branches.name as branch_name'
      );

    if (branchId) {
      query = query.where('orders.branch_id', branchId);
    }
    
    if (paymentType) {
      query = query.where('payments.payment_type', paymentType);
    }

    const payments = await query
      .orderBy('payments.paid_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json(payments);
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Process refund
router.post('/refund', [
  body('paymentId').isInt(),
  body('amount').optional().isFloat({ min: 0 }),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId, amount, reason } = req.body;

    const payment = await db('payments').where({ id: paymentId }).first();
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const refundAmount = amount || payment.amount;

    if (payment.payment_type === 'CARD' && stripe) {
      // Process Stripe refund
      const refund = await stripe.refunds.create({
        payment_intent: payment.transaction_ref,
        amount: Math.round(refundAmount * 100) // Convert to cents
      });

      // Record refund in database
      await db('payments').insert({
        order_id: payment.order_id,
        payment_type: 'REFUND',
        amount: -refundAmount,
        transaction_ref: refund.id,
        paid_at: db.raw('CURRENT_TIMESTAMP')
      });

      res.json({
        message: 'Refund processed successfully',
        refundId: refund.id,
        amount: refundAmount
      });
    } else {
      // Cash refund - just record it
      await db('payments').insert({
        order_id: payment.order_id,
        payment_type: 'REFUND',
        amount: -refundAmount,
        transaction_ref: `CASH-REFUND-${Date.now()}`,
        paid_at: db.raw('CURRENT_TIMESTAMP')
      });

      res.json({
        message: 'Cash refund recorded successfully',
        amount: refundAmount
      });
    }
  } catch (error) {
    logger.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

module.exports = router;