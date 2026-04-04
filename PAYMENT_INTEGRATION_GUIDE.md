# Premium24 Payment Integration Guide

## Overview
Complete WatchPay integration for Premium24 India, supporting Paytm payments in INR.

---

## 🗄️ Database Schema

### Tables Created

#### `payment_orders`
Stores all payment order information
```sql
- order_id (VARCHAR 100) - Unique order identifier
- user_id (BIGINT) - Reference to auth_users (nullable for guest payments)
- amount (DECIMAL 10,2) - Payment amount in INR
- currency (VARCHAR 3) - Currency code (default: INR)
- country (VARCHAR 50) - Country code (default: india)
- pay_type (INTEGER) - Paytm payment type code (101, 104, 105, etc.)
- payment_method (VARCHAR 100) - Human-readable payment method name
- description (TEXT) - Payment description
- status (VARCHAR 20) - pending | success | failed | cancelled
- transaction_id (VARCHAR 100) - WatchPay transaction ID
- reference_id (VARCHAR 100) - External reference ID
- ip_address (VARCHAR 45) - Client IP address
- user_agent (TEXT) - Client user agent
- created_at (TIMESTAMPTZ) - Order creation timestamp
- updated_at (TIMESTAMPTZ) - Last update timestamp
```

**Indexes:**
- `idx_payment_orders_user_id` - Fast user order lookup
- `idx_payment_orders_order_id` - Fast single order lookup
- `idx_payment_orders_status` - Payment status queries
- `idx_payment_orders_created_at` - Chronological queries
- `idx_payment_orders_transaction_id` - WatchPay txn lookup

---

#### `payment_callbacks`
Audit trail for all payment callbacks received
```sql
- order_id (VARCHAR 100) - Reference to payment_orders
- callback_type (VARCHAR 50) - watchpay_callback | status_check | webhook
- payload (JSONB) - Complete callback payload
- response_status (VARCHAR 20) - Our response status
- ip_address (VARCHAR 45) - Callback source IP
- created_at (TIMESTAMPTZ) - Callback timestamp
```

**Indexes:**
- `idx_payment_callbacks_order_id` - Callback history per order
- `idx_payment_callbacks_created_at` - Timeline queries

---

#### `transactions` (Enhanced)
Enhanced transaction tracking with payment support
```sql
NEW FIELDS:
- payment_order_id (VARCHAR 100) - Reference to payment_orders
- balance_before (DECIMAL 10,2) - Balance before transaction
- balance_after (DECIMAL 10,2) - Balance after transaction
```

---

## 🔧 Backend Endpoints

### 1. Create Payment Order
**POST** `/api/payment/create-order`

**Request:**
```json
{
  "amount": 499,
  "currency": "INR",
  "country": "india",
  "payType": 101,
  "paymentMethod": "Paytm Native Category 1",
  "description": "Premium24 Payment",
  "merchantId": "100528114"
}
```

**Response (Success):**
```json
{
  "orderId": "P24_1711690000000_abc123",
  "paymentUrl": "https://merchant.watchglb.com/pay/web?merchant_id=...",
  "status": "pending",
  "currency": "INR",
  "amount": 499
}
```

**Features:**
- ✅ Accepts unauthenticated requests (guest payments)
- ✅ Extracts user ID from bearer token if provided
- ✅ Stores payment order in database
- ✅ Logs IP address and user agent for security
- ✅ Generates WatchPay payment URL

---

### 2. Check Payment Status
**GET** `/api/payment/status/:orderId`

**Query Parameters:**
- Optional `Authorization: Bearer <token>` for authenticated requests

**Response (Success):**
```json
{
  "success": true,
  "orderId": "P24_1711690000000_abc123",
  "amount": 499,
  "currency": "INR",
  "status": "success",
  "paymentMethod": "Paytm Native Category 1",
  "transactionId": "TXN_WATCHPAY_......",
  "createdAt": "2026-03-29T10:30:00Z",
  "updatedAt": "2026-03-29T10:35:00Z"
}
```

**Features:**
- ✅ Works for both authenticated and unauthenticated requests
- ✅ Verifies user ownership when authenticated
- ✅ Returns full payment details

---

### 3. Payment Callback (WatchPay → Server)
**POST** `/api/payment/callback`

**WatchPay Sends:**
```json
{
  "order_id": "P24_1711690000000_abc123",
  "status": "success",
  "transaction_id": "TXN_WATCHPAY_......",
  "amount": 499,
  "currency": "INR",
  "pay_type": 101,
  "pay_status": "0"
}
```

**Our Response:**
```json
{
  "code": "0",
  "msg": "success"
}
```

**What Happens on Success:**
1. ✅ Order status updated to 'success'
2. ✅ Transaction ID stored
3. ✅ User wallet balance updated
4. ✅ Transaction record created (type: 'deposit')
5. ✅ User activity logged
6. ✅ Callback logged for audit trail

---

### 4. Alternative Webhook Endpoint
**POST** `/api/payment/webhook`

Alternative callback path that routes to `/api/payment/callback`

---

## 🔐 Environment Configuration

**File:** `backend/.env`

Required variables:
```env
# WatchPay Configuration
WATCHPAY_BASE_URL=https://merchant.watchglb.com
WATCHPAY_MERCHANT_ID=100528114
WATCHPAY_CURRENCY=INR
WATCHPAY_API_KEY=CTNB4ATD5XSZMKYFST1ED1HHY9JEUKEP

# Database
DATABASE_URL=postgresql://user:password@host:5432/premium24

# JWT Tokens
ACCESS_TOKEN_SECRET=<your-secret>
REFRESH_TOKEN_SECRET=<your-secret>

# Firebase (optional)
FIREBASE_PROJECT_ID=typingwork24
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

---

## 💳 Frontend Configuration

### Supported Paytm Payment Methods

**Type 1 (Category 1):**
- `101`: Paytm Native Category 1
- `104`: Paytm Entertainment
- `131`: Paytm Benchmark Score (Category 1)
- `132`: UPI Benchmark Score (Category 1)

**Type 2 (Category 2):**
- `105`: UPI Entertainment
- `122`: UPI Benchmark (Category II)
- `152`: UPI Native (Category II)

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Database migration applied: `schema.sql`
- [ ] Backend environment variables configured
- [ ] CORS origins include your domain
- [ ] Payment callback URL is publicly accessible
- [ ] WatchPay merchant credentials verified
- [ ] SSL/HTTPS enabled for payment pages
- [ ] Database backups configured
- [ ] Payment callback logging verified

### Starting Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000` by default.

---

## 📊 Payment Flow

```
User selects amount & payment method
        ↓
Frontend calls /api/payment/create-order
        ↓
Backend generates order, stores in DB
        ↓
Returns WatchPay payment URL
        ↓
Frontend redirects to WatchPay
        ↓
User completes payment on Paytm/UPI
        ↓
WatchPay calls /api/payment/callback
        ↓
Backend updates order status
        ↓
Backend updates user wallet
        ↓
Backend creates transaction record
        ↓
Frontend can poll /api/payment/status/:orderId
        ↓
Show success/failure to user
```

---

## 🔍 Debugging

### Check Payment Status in Database

```sql
-- Get order details
SELECT * FROM payment_orders WHERE order_id = 'P24_...';

-- Get payment callbacks
SELECT * FROM payment_callbacks WHERE order_id = 'P24_...';

-- Get transaction records
SELECT * FROM transactions 
WHERE payment_order_id = 'P24_...' 
ORDER BY created_at DESC;

-- Check user wallet
SELECT wallet_balance FROM auth_users WHERE id = user_id;
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Order not found after callback | Check CORS settings and callback URL is accessible |
| Wallet not updated | Check database user_id matches in payment_orders |
| Payment stuck as pending | Check WatchPay account balance and API key |
| Callback IP blocked | Allow WatchPay IPs in firewall |

---

## 📝 API Monitoring

Enable detailed logging in backend:
```javascript
// Already enabled with [payment] prefix
console.log('[payment] Create order error:', error);
console.log('[payment] Callback received:', payloadInfo);
```

---

## 🛡️ Security Notes

- ✅ Payments work for both authenticated and guest users
- ✅ User ownership verified before returning sensitive data
- ✅ IP addresses logged for fraud detection
- ✅ All callbacks logged for audit trail
- ✅ Database transactions atomic for wallet updates
- ✅ Proper error handling prevents side effects

---

## 📞 Support

For issues with:
- **Payment integration**: Check WatchPay docs at https://www.showdoc.com.cn/WatchPay (password: watchpay277)
- **Database**: Review `PAYMENT_INTEGRATION_GUIDE.md` database section
- **Backend**: Check server logs with `[payment]` prefix
- **Frontend**: Check browser console for `[watchpay]` logs

---

**Last Updated:** March 29, 2026
**Status:** ✅ Production Ready for India (INR)
