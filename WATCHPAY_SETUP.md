# WatchPay Integration Setup Guide

This guide explains how to integrate WatchPay payment gateway into your Premium24 application.

## Overview

WatchPay is a payment gateway that supports multiple countries and payment methods. This integration allows users to purchase Premium24 plans using various payment options.

## Configuration

### 1. Environment Variables

Update your `.env` file with WatchPay configuration:

```env
# WatchPay Payment Gateway Configuration
VITE_WATCHPAY_BASE_URL=https://your-actual-watchpay-domain.com
```

Replace `https://your-actual-watchpay-domain.com` with your actual WatchPay domain.

### 2. Merchant Configuration

The merchant IDs and payment keys for different countries are configured in `src/utils/watchpay.js`. Update the `WATCHPAY_CONFIG` object with your actual credentials:

```javascript
const WATCHPAY_CONFIG = {
  baseUrl: import.meta.env.VITE_WATCHPAY_BASE_URL || 'https://your-watchpay-domain.com',
  merchantIds: {
    india: 'YOUR_INDIAN_MERCHANT_ID',
    // ... update all merchant IDs
  },
  paymentKeys: {
    india: 'YOUR_INDIAN_PAYMENT_KEY',
    // ... update all payment keys
  },
  // ... rest of configuration
};
```

### 3. Database Setup

The payment system uses a `payment_orders` table. Run the database schema to create it:

```sql
-- This is already included in backend/schema.sql
-- Run the setup if you haven't already
```

## API Endpoints

The backend provides the following payment endpoints:

- `POST /api/payment/create-order` - Create a payment order
- `GET /api/payment/status/:orderId` - Check payment status
- `POST /api/payment/webhook` - WatchPay webhook handler
- `GET /api/payment/orders` - Get user's payment history

## Payment Flow

1. User selects a plan and payment amount
2. Frontend calls `createPaymentOrder()` from `watchpay.js`
3. Backend creates order record and returns payment URL
4. User is redirected to WatchPay payment page
5. After payment, WatchPay sends webhook to backend
6. Backend updates order status and user wallet balance
7. Frontend polls for payment status or receives callback

## Supported Countries & Payment Methods

The integration supports multiple countries with various payment methods:

- **India**: Paytm, UPI, etc.
- **Vietnam**: Online banking, Momo, etc.
- **Indonesia**: Online banking, OVO, etc.
- **Thailand**: SUPEX, etc.
- **Brazil**: PIX
- And many more...

See `src/utils/watchpay.js` for the complete list of supported countries and payment types.

## Testing

For testing, use the merchant IDs and payment keys provided in the WatchPay documentation. Make sure to:

1. Use test merchant accounts
2. Test different payment types
3. Verify webhook callbacks
4. Test payment status polling

## Security Notes

1. Store payment keys securely (never in client-side code for production)
2. Verify webhook signatures from WatchPay
3. Use HTTPS for all payment-related communications
4. Validate all payment parameters on both frontend and backend

## Troubleshooting

### Common Issues

1. **Payment window doesn't open**: Check popup blockers
2. **Webhook not received**: Verify callback URL configuration
3. **Payment status not updating**: Check polling implementation
4. **Invalid merchant ID**: Verify credentials in configuration

### Debug Mode

Enable debug logging by checking the browser console for payment-related errors.

## Support

For WatchPay-specific issues, refer to their official documentation or contact their support team.

For Premium24 integration issues, check the backend logs and frontend console for error messages.</content>
<parameter name="filePath">d:\android development\premium24\WATCHPAY_SETUP.md