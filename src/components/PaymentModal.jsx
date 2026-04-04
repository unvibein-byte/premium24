import React, { useState, useEffect } from 'react';
import { X, CreditCard, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import {
  createPaymentOrder,
  checkPaymentStatus,
  getPaymentTypes,
  getSupportedCountries,
  validatePaymentParams
} from '../utils/watchpay';

const PaymentModal = ({ isOpen, onClose, amount, currency = 'INR', onSuccess, onError, autoStart = false, presetCountry, presetPayType }) => {
  const [selectedCountry, setSelectedCountry] = useState('india'); // Default to India
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [paymentTypeCategory, setPaymentTypeCategory] = useState('type1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [status, setStatus] = useState(''); // 'idle', 'pending', 'success', 'failed'
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentWindow, setPaymentWindow] = useState(null);
  // Initialize with amount prop, or default to 499 for testing
  const [payAmount, setPayAmount] = useState(Number(amount) || 499);

  const countries = getSupportedCountries();
  const paymentTypes = selectedCountry ? getPaymentTypes(selectedCountry, paymentTypeCategory) : {};

  // Auto-select first payment method when payment types change
  useEffect(() => {
    if (!selectedPaymentType && Object.keys(paymentTypes).length > 0) {
      const firstPaymentType = Object.keys(paymentTypes)[0];
      setSelectedPaymentType(firstPaymentType);
      try { console.log('[ui] Auto-selected payment type:', firstPaymentType); } catch (_e) {}
    }
  }, [paymentTypes, selectedPaymentType]);

  // Initialize presets and optionally auto-start
  useEffect(() => {
    if (!isOpen) return;
    try { 
      console.log('[ui] PaymentModal open', { 
        amount, 
        payAmount, 
        presetCountry, 
        presetPayType, 
        autoStart,
        selectedCountry,
        paymentTypeCategory 
      }); 
    } catch (_e) {}
    
    // Set initial amount if provided
    if (amount && amount > 0) {
      setPayAmount(Number(amount));
    }
    
    // India is default, only override if preset is provided
    if (presetCountry) {
      setSelectedCountry(presetCountry);
    }
    if (presetPayType) {
      setSelectedPaymentType(String(presetPayType));
    }
  }, [isOpen, amount, presetCountry, presetPayType]);

  useEffect(() => {
    if (!isOpen) return;
    if (autoStart && payAmount > 0 && selectedCountry && selectedPaymentType && !isProcessing && status !== 'success') {
      // Delay slightly to ensure state is applied
      const t = setTimeout(() => {
        try { console.log('[ui] PaymentModal autoStart: triggering handlePayment'); } catch (_e) {}
        handlePayment();
      }, 50);
      return () => clearTimeout(t);
    } else {
      try {
        console.log('[ui] PaymentModal autoStart: waiting', {
          autoStart, payAmount, selectedCountry, selectedPaymentType, isProcessing, status
        });
      } catch (_e) {}
    }
  }, [autoStart, isOpen, payAmount, selectedCountry, selectedPaymentType, isProcessing, status]);

  useEffect(() => {
    if (selectedCountry) {
      setSelectedPaymentType('');
      setErrorMessage('');
    }
  }, [selectedCountry, paymentTypeCategory]);

  // Clean up when modal closes
  const handleClose = () => {
    if (paymentWindow) {
      paymentWindow.close();
    }
    setPayAmount(Number(amount) || 0);
    setSelectedCountry('');
    setSelectedPaymentType('');
    setStatus('');
    setErrorMessage('');
    setPaymentUrl('');
    setOrderId('');
    onClose();
  };

  const handlePayment = async () => {
    console.log('[ui] handlePayment:click', { payAmount, selectedCountry, selectedPaymentType, paymentTypes });
    try { console.log('[ui] handlePayment:start', { payAmount, selectedCountry, selectedPaymentType }); } catch (_e) {}
    setErrorMessage('');

    // Validation
    if (!selectedCountry) {
      setErrorMessage('Please select a country');
      try { console.warn('[ui] handlePayment:missingCountry'); } catch (_e) {}
      return;
    }
    if (!selectedPaymentType) {
      setErrorMessage('Please select a payment method');
      try { console.warn('[ui] handlePayment:missingPaymentType'); } catch (_e) {}
      return;
    }
    if (!payAmount || payAmount <= 0) {
      setErrorMessage('Invalid payment amount');
      try { console.warn('[ui] handlePayment:invalidAmount', { payAmount }); } catch (_e) {}
      return;
    }

    try {
      setIsProcessing(true);
      setStatus('pending');
      setErrorMessage('');

      // Validate payment parameters
      validatePaymentParams({
        country: selectedCountry,
        amount: payAmount,
        payType: selectedPaymentType
      });

      // Get payment method label
      const paymentMethodLabel = paymentTypes[selectedPaymentType] || `Payment Type ${selectedPaymentType}`;

      // Get current user info (replace with actual user data)
      const userInfo = {
        user_id: localStorage.getItem('userId') || 'guest',
        email: localStorage.getItem('userEmail') || 'user@example.com'
      };

      const result = await createPaymentOrder({
        country: selectedCountry,
        amount: payAmount,
        currency: 'INR',
        payType: selectedPaymentType,
        paymentMethod: paymentMethodLabel,
        userInfo,
        callbackUrl: `${window.location.origin}/api/payment/callback`,
        returnUrl: `${window.location.origin}/payment/success`,
        description: 'Premium24 Payment'
      });

      try { console.log('[ui] handlePayment:orderCreated', result); } catch (_e) {}
      if (!result.paymentUrl) {
        throw new Error('No payment URL received from provider');
      }

      setOrderId(result.orderId);
      setPaymentUrl(result.paymentUrl);

      // Redirect to payment page
      try {
        localStorage.setItem('pendingPlan', (typeof description === 'string' && description) || 'Premium');
        localStorage.setItem('lastOrderId', result.orderId || '');
      } catch (_e) {}
      try { console.log('[ui] handlePayment:redirect', { url: result.paymentUrl }); } catch (_e) {}
      window.location.href = result.paymentUrl;

    } catch (error) {
      console.error('Payment error:', error);
      setStatus('failed');
      const errorMsg = error.message || 'Failed to initiate payment. Please try again.';
      setErrorMessage(errorMsg);
      console.error('[ui] Payment error details:', {
        error: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      if (onError) onError(errorMsg);
    } finally {
      setIsProcessing(false);
      try { console.log('[ui] handlePayment:end'); } catch (_e) {}
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <CreditCard className="mr-2" size={24} />
            Make Payment
          </h2>
          <button 
            onClick={handleClose} 
            className="text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Enter Amount *</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-700 text-sm font-medium">
              ₹
            </span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              className="flex-1 p-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={isProcessing || status === 'success'}
              placeholder="Enter amount in INR"
            />
          </div>
        </div>

        {/* Country Display - India Only */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Country</label>
          <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 flex items-center">
            <Globe size={18} className="mr-2" />
            <span className="font-medium">India (INR)</span>
          </div>
        </div>

        {/* Payment Type Category */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Payment Category *</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setPaymentTypeCategory('type1')}
              className={`flex-1 px-3 py-2 rounded font-medium transition ${
                paymentTypeCategory === 'type1' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={isProcessing || status === 'success'}
            >
              Type 1
            </button>
            <button
              onClick={() => setPaymentTypeCategory('type2')}
              className={`flex-1 px-3 py-2 rounded font-medium transition ${
                paymentTypeCategory === 'type2' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={isProcessing || status === 'success'}
            >
              Type 2
            </button>
          </div>
        </div>

        {/* Payment Type Selection */}
        {Object.keys(paymentTypes).length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Payment Method *</label>
            <select
              value={selectedPaymentType}
              onChange={(e) => setSelectedPaymentType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={isProcessing || status === 'success'}
            >
              <option value="">Choose payment method...</option>
              {Object.entries(paymentTypes).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-md flex items-start">
            <AlertCircle className="mr-2 text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <span className="text-red-800 text-sm">{errorMessage}</span>
          </div>
        )}

        {/* Status Messages */}
        {status === 'pending' && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md flex items-center">
            <AlertCircle className="mr-2 text-yellow-600 animate-pulse" size={20} />
            <span className="text-yellow-800 text-sm">Processing payment... Please complete the payment in the opened window.</span>
          </div>
        )}

        {status === 'success' && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded-md flex items-center">
            <CheckCircle className="mr-2 text-green-600" size={20} />
            <span className="text-green-800 text-sm">Payment successful! Redirecting...</span>
          </div>
        )}

        {status === 'failed' && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-md flex items-center">
            <AlertCircle className="mr-2 text-red-600" size={20} />
            <span className="text-red-800 text-sm">Payment failed. Please try again.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={
              !selectedCountry || 
              !selectedPaymentType || 
              isProcessing || 
              status === 'success' ||
              !payAmount || 
              payAmount <= 0
            }
            className="flex-1 px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⌛</span>
                Processing...
              </span>
            ) : (
              'Pay Now'
            )}
          </button>
        </div>

        {/* Fallback Link */}
        {paymentUrl && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
            <p>If the payment window didn't open:</p>
            <a 
              href={paymentUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 hover:underline font-medium"
            >
              Click here to complete payment →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;