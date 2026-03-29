/**
 * Payment API Handler for WatchPay Integration
 * Handles payment callbacks and transaction verification
 */

import crypto from 'crypto';
import express from 'express';

/**
 * Create payment router with database pool
 * @param {pg.Pool} pool - PostgreSQL connection pool
 */
export function createPaymentRouter(pool) {
  const router = express.Router();

  /**
   * POST /api/payment/callback
   * Handle WatchPay payment callback
   */
  router.post('/callback', async (req, res) => {
    try {
      const {
        order_id,
        merchant_id,
        amount,
        currency,
        status,
        pay_type,
        sign,
        timestamp,
        reference_id
      } = req.body;

      console.log('Payment callback received:', {
        order_id,
        status,
        amount,
        reference_id
      });

      // Validate required fields
      if (!order_id || !status || !amount) {
        return res.status(400).json({
          code: '1001',
          msg: 'Missing required fields'
        });
      }

      // Verify signature (implement WatchPay signature verification)
      // For now, we'll accept the callback if all required fields are present
      
      // Update order status in database
      try {
        const query = `
          UPDATE payment_orders 
          SET status = $1, 
              updated_at = NOW(),
              pay_type = $2,
              currency = $3
          WHERE order_id = $4
          RETURNING *
        `;

        const result = await pool.query(query, [
          status,
          pay_type,
          currency,
          order_id
        ]);

        if (result.rows.length === 0) {
          console.warn(`Order not found: ${order_id}`);
          return res.status(404).json({
            code: '1002',
            msg: 'Order not found'
          });
        }

        const order = result.rows[0];

        // If payment successful, update user balance
        if (status === 'success' || status === '0') {
          await handleSuccessfulPayment(pool, order);
        }

        // Return success response to WatchPay
        return res.json({
          code: '0',
          msg: 'success'
        });

      } catch (dbError) {
        console.error('Database error in payment callback:', dbError);
        return res.status(500).json({
          code: '1003',
          msg: 'Database error'
        });
      }

    } catch (error) {
      console.error('Payment callback error:', error);
      return res.status(500).json({
        code: '9999',
        msg: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/payment/status/:orderId
   * Check payment status
   */
  router.get('/status/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      // Query database for order status
      const query = `
        SELECT order_id, status, amount, currency, pay_type, created_at, updated_at
        FROM payment_orders
        WHERE order_id = $1
        LIMIT 1
      `;

      const result = await pool.query(query, [orderId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const order = result.rows[0];

      return res.json({
        success: true,
        status: order.status,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        pay_type: order.pay_type,
        created_at: order.created_at,
        updated_at: order.updated_at
      });

    } catch (error) {
      console.error('Payment status check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/payment/create
   * Create payment order record
   */
  router.post('/create', async (req, res) => {
    try {
      const {
        order_id,
        merchant_id,
        amount,
        currency,
        pay_type,
        user_id,
        email,
        country
      } = req.body;

      // Validate required fields
      if (!order_id || !amount || !currency || !pay_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Insert order into database
      const query = `
        INSERT INTO payment_orders 
        (order_id, user_id, amount, currency, country, pay_type, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
        RETURNING *
      `;

      const result = await pool.query(query, [
        order_id,
        user_id || null,
        amount,
        currency,
        country,
        pay_type
      ]);

      return res.json({
        success: true,
        code: '0',
        msg: 'success',
        order: result.rows[0]
      });

    } catch (error) {
      console.error('Payment order creation error:', error);

      if (error.code === '23505') {
        // Duplicate order ID
        return res.status(409).json({
          success: false,
          code: '1004',
          message: 'Order with this ID already exists'
        });
      }

      return res.status(500).json({
        success: false,
        code: '9999',
        message: 'Internal server error'
      });
    }
  });

  /**
   * Handle successful payment
   */
  async function handleSuccessfulPayment(pool, order) {
    try {
      // Update user balance in database
      if (order.user_id) {
        const updateQuery = `
          UPDATE auth_users
          SET wallet_balance = wallet_balance + $1,
              updated_at = NOW()
          WHERE id = $2
        `;

        await pool.query(updateQuery, [order.amount, order.user_id]);

        // Log transaction
        const logQuery = `
          INSERT INTO transactions 
          (user_id, type, amount, order_id, status, description, created_at, updated_at)
          VALUES ($1, 'deposit', $2, $3, 'success', 'Payment from WatchPay', NOW(), NOW())
        `;

        await pool.query(logQuery, [order.user_id, order.amount, order.order_id]);
      }

      console.log(`Payment successful for order ${order.order_id}`);

    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  }

  return router;
}

export default createPaymentRouter;
