const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validatePayment } = require('../middleware/validation');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Record payment (cashier)
router.post('/', authenticateToken, authorize('admin', 'manager', 'cashier'), validatePayment, async (req, res) => {
  try {
    const { orderId, paymentType, amount, transactionRef } = req.body;

    const order = await db('orders').where({ id: orderId }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order is already paid
    const existingPayments = await db('payments').where({ order_id: orderId });
    const totalPaid = existingPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    if (totalPaid >= order.total) {
      return res.status(400).json({ error: 'Order is already fully paid' });
    }

    // Create payment record
    const [paymentId] = await db('payments').insert({
      order_id: orderId,
      payment_type: paymentType,
      amount,
      transaction_ref: transactionRef
    });

    // Update order payment status
    const newTotalPaid = totalPaid + amount;
    const paymentStatus = newTotalPaid >= order.total ? 'PAID' : 'PARTIAL';
    
    await db('orders')
      .where({ id: orderId })
      .update({
        payment_status: paymentStatus,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // If fully paid, update order status to completed
    if (paymentStatus === 'PAID' && order.status === 'SERVED') {
      await db('orders')
        .where({ id: orderId })
        .update({
          status: 'COMPLETED',
          updated_at: db.raw('CURRENT_TIMESTAMP')
        });
    }

    const payment = await db('payments').where({ id: paymentId }).first();

    // Emit real-time event
    const io = req.app.get('io');
    const updatedOrder = await db('orders')
      .select('orders.*', 'tables.table_number')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .where({ 'orders.id': orderId })
      .first();

    io.to(`branch:${order.branch_id}:cashier`).emit('payment.recorded', {
      orderId,
      payment,
      paymentStatus,
      totalPaid: newTotalPaid
    });

    // Log payment
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'PAYMENT_RECORD',
      meta: JSON.stringify({ 
        orderId, 
        paymentId, 
        paymentType, 
        amount, 
        transactionRef,
        userId: req.user.id
      })
    });

    logger.info(`Payment recorded for order ${orderId}: ${paymentType} ${amount}`);

    res.status(201).json({ 
      payment, 
      paymentStatus,
      totalPaid: newTotalPaid,
      message: 'Payment recorded successfully' 
    });

  } catch (error) {
    logger.error('Payment recording error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Process card payment (Stripe)
router.post('/card', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { orderId, paymentMethodId, amount } = req.body;

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    const order = await db('orders').where({ id: orderId }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'mad', // Moroccan Dirham
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/order/${orderId}`,
      metadata: {
        orderId: orderId.toString(),
        orderCode: order.order_code
      }
    });

    if (paymentIntent.status === 'succeeded') {
      // Record successful payment
      const [paymentId] = await db('payments').insert({
        order_id: orderId,
        payment_type: 'CARD',
        amount,
        transaction_ref: paymentIntent.id
      });

      // Update order payment status
      await db('orders')
        .where({ id: orderId })
        .update({
          payment_status: 'PAID',
          status: order.status === 'SERVED' ? 'COMPLETED' : order.status,
          updated_at: db.raw('CURRENT_TIMESTAMP')
        });

      // Emit real-time event
      const io = req.app.get('io');
      const updatedOrder = await db('orders')
        .select('orders.*', 'tables.table_number')
        .leftJoin('tables', 'orders.table_id', 'tables.id')
        .where({ 'orders.id': orderId })
        .first();

      io.to(`branch:${order.branch_id}:cashier`).emit('payment.recorded', {
        orderId,
        payment: { id: paymentId, payment_type: 'CARD', amount, transaction_ref: paymentIntent.id },
        paymentStatus: 'PAID',
        totalPaid: amount
      });

      // Log payment
      await db('audit_logs').insert({
        user_id: req.user.id,
        action: 'CARD_PAYMENT',
        meta: JSON.stringify({ 
          orderId, 
          paymentId, 
          stripePaymentIntentId: paymentIntent.id,
          amount,
          userId: req.user.id
        })
      });

      logger.info(`Card payment successful for order ${orderId}: ${paymentIntent.id}`);

      res.json({ 
        success: true,
        paymentIntent,
        message: 'Payment processed successfully' 
      });
    } else {
      res.status(400).json({ 
        error: 'Payment failed', 
        paymentIntent 
      });
    }

  } catch (error) {
    logger.error('Card payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Get payments for an order
router.get('/order/:orderId', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { orderId } = req.params;

    const payments = await db('payments')
      .where({ order_id: orderId })
      .orderBy('paid_at', 'desc');

    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    res.json({ payments, totalPaid });
  } catch (error) {
    logger.error('Payments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Process refund
router.post('/refund', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    const payment = await db('payments').where({ id: paymentId }).first();
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    let refundTransactionRef = null;

    // If it's a card payment, process Stripe refund
    if (payment.payment_type === 'CARD' && payment.transaction_ref) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: payment.transaction_ref,
          amount: Math.round(amount * 100), // Convert to cents
          reason: 'requested_by_customer'
        });
        refundTransactionRef = refund.id;
      } catch (stripeError) {
        logger.error('Stripe refund error:', stripeError);
        return res.status(400).json({ error: 'Failed to process card refund' });
      }
    }

    // Create refund record (negative payment)
    const [refundId] = await db('payments').insert({
      order_id: payment.order_id,
      payment_type: 'REFUND',
      amount: -amount,
      transaction_ref: refundTransactionRef || `REF-${Date.now()}`
    });

    // Update order payment status
    const order = await db('orders').where({ id: payment.order_id }).first();
    const allPayments = await db('payments').where({ order_id: payment.order_id });
    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    const paymentStatus = totalPaid >= order.total ? 'PAID' : 'PARTIAL';
    
    await db('orders')
      .where({ id: payment.order_id })
      .update({
        payment_status: paymentStatus,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // Log refund
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'REFUND',
      meta: JSON.stringify({ 
        paymentId, 
        refundId, 
        amount, 
        reason,
        refundTransactionRef,
        userId: req.user.id
      })
    });

    logger.info(`Refund processed for payment ${paymentId}: ${amount}`);

    res.json({ 
      refundId,
      refundTransactionRef,
      message: 'Refund processed successfully' 
    });

  } catch (error) {
    logger.error('Refund processing error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Stripe webhook handler
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        logger.info(`Stripe payment succeeded: ${paymentIntent.id}`);
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        logger.error(`Stripe payment failed: ${failedPayment.id}`);
        break;
      
      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;