const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testWatchPayAPI() {
  const merchantId = '100528114';
  const paymentKey = 'CTNB4ATD5XSZMKYFST1ED1HHY9JEUKEP';
  const baseUrl = 'https://merchant.watchglb.com';
  const orderId = `P24_${Date.now()}_test123`;
  const amount = '499.00';
  const currency = 'INR';
  const payType = '101';

  const payload = {
    merchant_id: merchantId,
    order_id: orderId,
    amount: amount,
    currency: currency,
    pay_type: payType,
    callback_url: 'http://localhost:4000/api/payment/callback',
    return_url: 'http://localhost:4000/payment/success',
    sign_type: 'MD5',
  };

  // Calculate signature
  const signBase = `${payload.merchant_id}${payload.order_id}${payload.amount}${payload.currency}${paymentKey}`;
  payload.sign = crypto.createHash('md5').update(signBase).digest('hex');

  console.log('Test WatchPay API Integration');
  console.log('=============================');
  console.log('Request URL:', `${baseUrl}/api/pay/create`);
  console.log('Merchant ID:', merchantId);
  console.log('Order ID:', orderId);
  console.log('Sign Base:', signBase);
  console.log('Sign:', payload.sign);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${baseUrl}/api/pay/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.log('Response is not JSON');
    }

    console.log('\nWatchPay Response:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Body (Raw):', responseText);
    console.log('Body (Parsed):', responseData);

    if (responseData.respcode) {
      console.log('\nInterpretation:');
      console.log('Response Code:', responseData.respcode);
      console.log('Login Code:', responseData.logincode);
      console.log('Response Message:', responseData.respMsg);
      
      if (responseData.respcode === '-2') {
        console.log('\n⚠️  Error: Not logged in (-2)');
        console.log('Possible causes:');
        console.log('  1. WatchPay requires a session/login first');
        console.log('  2. IP address needs to be whitelisted');
        console.log('  3. Merchant ID or Payment Key is incorrect');
        console.log('  4. API endpoint URL is wrong');
      }
    }
  } catch (error) {
    console.error('Network/Fetch Error:', error.message);
    console.log('\nDebug Info:');
    console.log('Node version:', process.version);
    console.log('Attempting request to:', `${baseUrl}/api/pay/create`);
  }
}

testWatchPayAPI();
