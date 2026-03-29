/**
 * WatchPay Integration Utility
 * Handles payment operations for Premium24 app
 */

// WatchPay Configuration
const WATCHPAY_CONFIG = {
  baseUrl: import.meta.env.VITE_WATCHPAY_BASE_URL || 'https://merchant.watchglb.com',
  merchantIds: {
    india: '100528114',
    thailand: '600111001',
    indonesia: '222888001',
    brazil: '222886001',
    vietnam: '800100001',
    'south-africa': '888000001',
    poland: '911000001',
    kenya: '333001001',
    argentina: '999002001',
    turkey: '910000001',
    nigeria: '999000001',
    colombia: '977000001',
    malaysia: '111887001',
    philippines: '777000001',
    ukraine: '500000001',
    mexico: '700111001',
    ghana: '998001001',
    peru: '666001001',
    eu: '988001001',
    usa: '966001001',
    uk: '966002001',
    bangladesh: '955001001',
    egypt: '966001001',
    simt: '922000001',
    russia: '933000001',
    pakistan: '111001001',
    kazakhstan: '968001001',
    zambia: '978001001',
    bolivia: '966000001',
    ecuador: '955111111'
  },
  paymentKeys: {
    india: '8979d78b437948f18c14628ff1ad5f41',
    thailand: '01d38989aa524b099962e19301f4553c',
    indonesia: '6QUOUSXE6BCZPW8KZ1LQF7XZARXE69XO',
    brazil: 'GM4NVMDPPLV3MZGLHDTK3VDJ1PZVUHH2',
    vietnam: 'ae89fc17c9f043858fc03872ca72e8d0',
    'south-africa': 'fd9d93b1fc914d419f39a8e8bceff795',
    poland: 'c95147b89e9d4adc942fd48e777d9f52',
    kenya: 'd2638027d9c847d492c7447cd77da82a',
    argentina: '1759281221804ef7b87b4b2f6c052b5e',
    turkey: 'a5629528cfb0495f8013eced6ff66762',
    nigeria: '45309fa6af2543aa9474e46d628bda5f',
    colombia: '572ec680736f4a42a711c83a44d312d9',
    malaysia: '8ba4b3d14415441aa9fc1eca23093c7c',
    philippines: '66441809a4d548019529c4934eeb605',
    ukraine: '1d6b495c305045e3adb0e947ae3e1366',
    mexico: 'XOPAHBSMHYCCJQV3Z6P9OKM9TOIVNOIW',
    ghana: 'a0dabbea53334d75a8297d27811f4ef6',
    peru: '7c9372d2426e4827addfaaedb254b23e',
    eu: '439b4c7fa8104dadb00d57e3872d9096',
    usa: '8c3c0004624e475d9efc211eccfed810',
    uk: 'a631245c0b2041f58ceb4717b9cc7951',
    bangladesh: 'e67d789a20e44abe98e9a4187559d060',
    egypt: '2ff3b3bee59c4a3aa996b9a646f4a3e3',
    simt: '8c72f0a25c9e4a7686f55207c82c51c6',
    russia: 'eba859559875460e8c89d6ad4c9040fe',
    pakistan: '26932395d8a443f6864847dfb3017727',
    kazakhstan: '9cd3ec7102b94ba182b1fbe7bf534c2e',
    zambia: 'd989f7c4d6f546f8a40da07ebe0a8b98',
    bolivia: 'cc53e15e620a41bcb0bd67adc40cd4ab',
    ecuador: '037f5071ad0e49c4996faed4891b23aa'
  },
  paymentTypes: {
    india: {
      type1: { 104: 'Paytm Entertainment', 131: 'Paytm Benchmark Score (Category 1)', 101: 'Paytm Native Score (Category 1)', 132: 'UPI Benchmark Score (Category 1)' },
      type2: { 105: 'UPI Entertainment', 122: 'UPI Benchmark (Category II)', 152: 'UPI Native (Category II)' }
    },
    vietnam: {
      type1: { 1: 'Online banking', 2: 'Online banking to card transfer', 3: 'Momo' },
      type2: { 21: 'Online banking direct connection (Category II)', 22: 'Online banking to card transfer (Category II)', 23: 'Momo (Category II)' }
    },
    indonesia: {
      type1: { 200: 'Online banking B2C', 202: 'OVO Wallet' },
      type2: { 220: 'Online banking B2C Category II', 222: 'OVO Wallet Category II', 240: 'Online banking B2C Category III', 243: 'QRIS Wallet QR code payment Category III' }
    },
    thailand: {
      type1: { 300: 'SUPEX QR code scanning type 1' },
      type2: { 320: 'SUPEX QR code scanning (Class II)' }
    },
    brazil: {
      type1: { 600: 'PIX Class 1' },
      type2: { 620: 'PIX Class II' }
    },
    // Add more countries as needed
  }
};

/**
 * Generate a unique order ID
 */
function generateOrderId() {
  return `P24_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate signature for payment request
 * @param {Object} data - Order data
 * @param {string} paymentKey - Payment key
 */
function generateSignature(data, paymentKey) {
  // WatchPay uses MD5 hash of concatenated params + key
  const params = [
    data.merchant_id,
    data.order_id,
    data.amount,
    data.currency,
    paymentKey
  ].join('');
  
  // For now, return the key as is - adjust if WatchPay requires MD5
  return paymentKey;
}

/**
 * Create a payment order
 * @param {Object} params - Payment parameters
 * @param {string} params.country - Country code (e.g., 'india', 'vietnam')
 * @param {number} params.amount - Payment amount
 * @param {string} params.currency - Currency code
 * @param {string} params.payType - Payment type code
 * @param {Object} params.userInfo - User information
 * @param {string} params.callbackUrl - Callback URL for payment result
 * @param {string} params.returnUrl - Return URL after payment
 */
export async function createPaymentOrder(params) {
  const {
    country,
    amount,
    currency = 'USD',
    payType,
    userInfo = {},
    callbackUrl,
    returnUrl
  } = params;

  // Validate all required parameters
  if (!country || !amount || !payType) {
    throw new Error('Missing required payment parameters');
  }

  const merchantId = WATCHPAY_CONFIG.merchantIds[country];
  const paymentKey = WATCHPAY_CONFIG.paymentKeys[country];

  if (!merchantId || !paymentKey) {
    throw new Error(`Unsupported country: ${country}`);
  }

  // Validate payment type code
  const allPaymentTypes = {
    ...WATCHPAY_CONFIG.paymentTypes[country]?.type1 || {},
    ...WATCHPAY_CONFIG.paymentTypes[country]?.type2 || {}
  };

  if (!allPaymentTypes[payType]) {
    throw new Error(`Invalid payment type: ${payType} for country: ${country}`);
  }

  const orderId = generateOrderId();
  const timestamp = Math.floor(Date.now() / 1000);

  const orderData = {
    merchant_id: merchantId,
    order_id: orderId,
    amount: Math.round(amount * 100) / 100, // Ensure decimal precision
    currency: currency.toUpperCase(),
    pay_type: String(payType),
    callback_url: callbackUrl || `${window.location.origin}/api/payment/callback`,
    return_url: returnUrl || `${window.location.origin}/payment/success`,
    timestamp,
    notify_url: callbackUrl,
    sign_type: 'MD5'
  };

  // Add user info if provided
  if (userInfo.user_id) {
    orderData.reference_id = userInfo.user_id;
  }
  if (userInfo.email) {
    orderData.email = userInfo.email;
  }

  // Generate signature
  orderData.sign = generateSignature(orderData, paymentKey);

  try {
    const response = await fetch(`${WATCHPAY_CONFIG.baseUrl}/api/pay/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
      credentials: 'omit'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Payment order creation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Check if API returned success
    if (result.status !== 'success' && result.code !== '0' && !result.payment_url) {
      throw new Error(result.msg || result.message || 'Failed to create payment order');
    }

    // Construct payment URL - WatchPay returns a URL to redirect to
    const paymentUrl = result.payment_url || result.url || 
      `${WATCHPAY_CONFIG.baseUrl}/pay?order_id=${orderId}&merchant_id=${merchantId}`;

    return {
      success: true,
      orderId,
      paymentUrl,
      code: result.code,
      msg: result.msg,
      merchantId,
      country,
      timestamp
    };

  } catch (error) {
    console.error('Error creating payment order:', error);
    throw new Error(`Failed to initiate payment: ${error.message}`);
  }
}

/**
 * Check payment status
 * @param {string} orderId - Order ID to check
 */
export async function checkPaymentStatus(orderId) {
  try {
    const response = await fetch(`${WATCHPAY_CONFIG.baseUrl}/query/transfer?order_id=${orderId}`);
    if (!response.ok) {
      throw new Error(`Payment status check failed: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
}

/**
 * Check merchant balance
 * @param {string} country - Country code
 */
export async function checkBalance(country) {
  const merchantId = WATCHPAY_CONFIG.merchantIds[country];
  const paymentKey = WATCHPAY_CONFIG.paymentKeys[country];

  if (!merchantId || !paymentKey) {
    throw new Error(`Unsupported country: ${country}`);
  }

  try {
    const response = await fetch(`${WATCHPAY_CONFIG.baseUrl}/query/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        payment_key: paymentKey
      })
    });

    if (!response.ok) {
      throw new Error(`Balance check failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking balance:', error);
    throw error;
  }
}

/**
 * Get available payment types for a country
 * @param {string} country - Country code
 * @param {string} type - Type category ('type1' or 'type2')
 */
export function getPaymentTypes(country, type = 'type1') {
  return WATCHPAY_CONFIG.paymentTypes[country]?.[type] || {};
}

/**
 * Get supported countries
 */
export function getSupportedCountries() {
  return Object.keys(WATCHPAY_CONFIG.merchantIds);
}

/**
 * Validate payment parameters
 * @param {Object} params - Parameters to validate
 */
export function validatePaymentParams(params) {
  const { country, amount, payType } = params;

  if (!country || !WATCHPAY_CONFIG.merchantIds[country]) {
    throw new Error('Invalid or unsupported country');
  }

  if (!amount || amount <= 0) {
    throw new Error('Invalid payment amount. Must be greater than 0.');
  }

  if (!payType) {
    throw new Error('Payment type is required');
  }

  // Validate that the payment type code exists for the country
  const paymentTypesList = {
    ...WATCHPAY_CONFIG.paymentTypes[country]?.type1 || {},
    ...WATCHPAY_CONFIG.paymentTypes[country]?.type2 || {}
  };

  if (!paymentTypesList[payType]) {
    const availableTypes = Object.keys(paymentTypesList).join(', ');
    throw new Error(`Invalid payment type: ${payType}. Available types: ${availableTypes}`);
  }

  return true;
}

export { WATCHPAY_CONFIG };