/**
 * WatchPay Integration Utility
 * Handles payment operations for Premium24 app
 * India Only Configuration
 */

// WatchPay Configuration - India Only
const WATCHPAY_CONFIG = {
  baseUrl: import.meta.env.VITE_WATCHPAY_BASE_URL || 'https://merchant.watchglb.com',
  merchantIds: {
    india: '100528114'
  },
  paymentKeys: {
    india: 'CTNB4ATD5XSZMKYFST1ED1HHY9JEUKEP'
  },
  paymentTypes: {
    india: {
      type1: { 
        101: 'Paytm Native Category 1',
        104: 'Paytm Entertainment', 
        131: 'Paytm Benchmark Score (Category 1)', 
        132: 'UPI Benchmark Score (Category 1)' 
      },
      type2: { 
        105: 'UPI Entertainment', 
        122: 'UPI Benchmark (Category II)', 
        152: 'UPI Native (Category II)' 
      }
    }
  }
};

// Backend API base URL helper (mirrors App.jsx default)
const API_BASE = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL || '').trim();
  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  let finalUrl = '';
  if (!configured) {
    finalUrl = '';
  } else {
    finalUrl = configured.endsWith('/') ? configured.slice(0, -1) : configured;
  }
  
  // Log the API base URL for debugging
  try {
    console.log('[watchpay] API_BASE configured:', { 
      isDev: import.meta.env.DEV, 
      isLocalHost, 
      configured,
      finalUrl 
    });
  } catch (_e) {}
  
  return finalUrl;
})();

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
 * @param {string} params.country - Country code (e.g., 'india')
 * @param {number} params.amount - Payment amount
 * @param {string} params.currency - Currency code (default: INR)
 * @param {number} params.payType - Payment type code (e.g., 101 for Paytm)
 * @param {string} params.paymentMethod - Human-readable payment method name
 * @param {Object} params.userInfo - User information
 * @param {string} params.callbackUrl - Callback URL for payment result
 * @param {string} params.returnUrl - Return URL after payment
 */
export async function createPaymentOrder(params) {
  try {
    console.log('[watchpay] createPaymentOrder:start', {
      amount: params?.amount,
      currency: params?.currency,
      country: params?.country,
      payType: params?.payType,
      paymentMethod: params?.paymentMethod,
      hasUserInfo: Boolean(params?.userInfo),
    });
  } catch (_e) {}

  const {
    country,
    amount,
    currency = 'INR',
    payType,
    paymentMethod,
    userInfo = {},
    callbackUrl,
    returnUrl,
    description
  } = params;

  // Validate all required parameters
  if (!country || !amount || !payType) {
    throw new Error('Missing required payment parameters');
  }

  // Get merchant ID for the country
  const merchantId = WATCHPAY_CONFIG.merchantIds[country];
  if (!merchantId) {
    throw new Error(`Unsupported country: ${country}`);
  }

  try {
    // Create order via backend to persist and secure integration
    const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('firebaseIdToken') || '';
    const requestUrl = `${API_BASE}/api/payment/create-order`;
    const requestBody = {
      amount: Math.round(amount * 100) / 100,
      currency: currency.toUpperCase(),
      country,
      payType: parseInt(payType),
      merchantId,
      paymentMethod: paymentMethod || '',
      description: description || 'Premium24 Payment',
      callbackUrl,
      returnUrl,
      userInfo
    };
    
    console.log('[watchpay] createPaymentOrder:request', {
      url: requestUrl,
      api_base: API_BASE,
      hasAccessToken: Boolean(accessToken),
      merchantId,
      paymentMethod,
      requestBody
    });
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[watchpay] createPaymentOrder:response', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[watchpay] createPaymentOrder:success', result);
      return {
        success: true,
        orderId: result.orderId,
        paymentUrl: result.paymentUrl,
        status: result.status
      };
    }

    const errorText = await response.text();
    console.error('[watchpay] createPaymentOrder:errorBody', {
      status: response.status,
      statusText: response.statusText,
      errorText,
      contentType: response.headers.get('content-type')
    });
    throw new Error(`Payment order creation failed: ${response.status} ${response.statusText} - ${errorText}`);

  } catch (error) {
    console.error('[watchpay] createPaymentOrder:exception', {
      message: error.message,
      error: error,
      stack: error.stack
    });
    throw new Error(`Failed to initiate payment: ${error.message}`);
  }
}

/**
 * Check payment status
 * @param {string} orderId - Order ID to check
 */
export async function checkPaymentStatus(orderId) {
  try {
    const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('firebaseIdToken') || '';
    const response = await fetch(`${API_BASE}/api/payment/status/${orderId}`, {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    });
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
 * Headless starter: create order and open payment window without UI
 * Returns the order details so caller can optionally poll status.
 */
export async function startPaymentFlow({ amount, currency = 'USD', country, payType, description, userInfo }) {
  console.log('[watchpay] startPaymentFlow:click', { amount, currency, country, payType });
  const result = await createPaymentOrder({
    amount,
    currency,
    country,
    payType,
    description,
    userInfo,
  });
  if (!result?.paymentUrl) {
    console.error('[watchpay] startPaymentFlow:noPaymentUrl', result);
    throw new Error('No payment URL received from server');
  }
  console.log('[watchpay] startPaymentFlow:openWindow', { url: result.paymentUrl });
  const newWindow = window.open(result.paymentUrl, 'WatchPayment', 'width=800,height=600');
  if (!newWindow) {
    console.error('[watchpay] startPaymentFlow:popupBlocked');
    throw new Error('Payment window blocked. Please allow popups and try again.');
  }
  console.log('[watchpay] startPaymentFlow:windowOpened');
  return result;
}

/**
 * Build a direct WatchPay web URL (no backend, for immediate redirect)
 * NOTE: Some channels may still require server-signed orders. Use for demo/fast path.
 */
export function buildDirectPaymentUrl({
  amount,
  currency = 'INR',
  country = 'india',
  payType = '101',
  description = 'Premium24 Payment',
  returnUrl,
}) {
  const orderId = `P24_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const base = WATCHPAY_CONFIG.baseUrl || 'https://merchant.watchglb.com';
  const merchantId = WATCHPAY_CONFIG.merchantIds[country] || WATCHPAY_MERCHANT_ID_FALLBACK();
  const ru = returnUrl || `${window.location.origin}/payment/success`;
  const url =
    `${base}/pay/web?merchant_id=${encodeURIComponent(merchantId)}` +
    `&order_id=${encodeURIComponent(orderId)}` +
    `&amount=${encodeURIComponent(Math.round(Number(amount) * 100) / 100)}` +
    `&currency=${encodeURIComponent(String(currency).toUpperCase())}` +
    `&pay_type=${encodeURIComponent(String(payType))}` +
    `&return_url=${encodeURIComponent(ru)}` +
    `&description=${encodeURIComponent(description)}` +
    `&country=${encodeURIComponent(country)}`;
  return { orderId, paymentUrl: url };
}

// Fallback if config is missing; returns common India merchant ID for dev
function WATCHPAY_MERCHANT_ID_FALLBACK() {
  return '100528114';
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