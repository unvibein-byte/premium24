import React, { useState, useEffect } from 'react';
import { X, CreditCard, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import {
  createPaymentOrder,
  checkPaymentStatus,
  getPaymentTypes,
  getSupportedCountries,
  validatePaymentParams
} from '../utils/watchpay';

const PaymentModal = ({ isOpen, onClose, amount, currency = 'USD', onSuccess, onError }) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [paymentTypeCategory, setPaymentTypeCategory] = useState('type1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [status, setStatus] = useState(''); // 'idle', 'pending', 'success', 'failed'
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentWindow, setPaymentWindow] = useState(null);

  const countries = getSupportedCountries();
  const paymentTypes = selectedCountry ? getPaymentTypes(selectedCountry, paymentTypeCategory) : {};

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
    setSelectedCountry('');
    setSelectedPaymentType('');
    setStatus('');
    setErrorMessage('');
    setPaymentUrl('');
    setOrderId('');
    onClose();
  };

  const handlePayment = async () => {
    setErrorMessage('');

    // Validation
    if (!selectedCountry) {
      setErrorMessage('Please select a country');
      return;
    }
    if (!selectedPaymentType) {
      setErrorMessage('Please select a payment method');
      return;
    }
    if (!amount || amount <= 0) {
      setErrorMessage('Invalid payment amount');
      return;
    }

    try {
      setIsProcessing(true);
      setStatus('pending');
      setErrorMessage('');

      // Validate payment parameters
      validatePaymentParams({
        country: selectedCountry,
        amount,
        payType: selectedPaymentType
      });

      // Get current user info (replace with actual user data)
      const userInfo = {
        user_id: localStorage.getItem('userId') || 'guest',
        email: localStorage.getItem('userEmail') || 'user@example.com'
      };

      const result = await createPaymentOrder({
        country: selectedCountry,
        amount,
        currency,
        payType: selectedPaymentType,
        userInfo,
        callbackUrl: `${window.location.origin}/api/payment/callback`,
        returnUrl: `${window.location.origin}/payment/success`
      });

      if (!result.paymentUrl) {
        throw new Error('No payment URL received from provider');
      }

      setOrderId(result.orderId);
      setPaymentUrl(result.paymentUrl);

      // Open payment window
      const newWindow = window.open(result.paymentUrl, 'WatchPayment', 'width=800,height=600');
      setPaymentWindow(newWindow);

      if (!newWindow) {
        setErrorMessage('Payment window blocked. Please allow popups and try again.');
        setStatus('failed');
        return;
      }

      // Start polling for payment status
      pollPaymentStatus(result.orderId);

    } catch (error) {
      console.error('Payment error:', error);
      setStatus('failed');
      const errorMsg = error.message || 'Failed to initiate payment. Please try again.';
      setErrorMessage(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (orderId) => {
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes with 5s interval
    
    const pollInterval = setInterval(async () => {
      pollCount++;

      try {
        const statusResult = await checkPaymentStatus(orderId);
        
        // Check various possible success indicators
        if (statusResult?.status === 'success' || 
            statusResult?.code === '0' || 
            statusResult?.success === true) {
          setStatus('success');
          clearInterval(pollInterval);
          if (onSuccess) onSuccess(statusResult);
          setTimeout(() => handleClose(), 2000);
        } else if (statusResult?.status === 'failed' || 
                   statusResult?.status === 'error') {
          setStatus('failed');
          setErrorMessage(statusResult?.message || 'Payment was not completed');
          clearInterval(pollInterval);
          if (onError) onError(statusResult?.message || 'Payment failed');
        }
      } catch (error) {
        console.error('Status check error:', error);
        // Continue polling even if status check fails
      }

      // Stop polling after max retries
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        setStatus('failed');
        setErrorMessage('Payment status check timed out. Please check the payment portal.');
      }
    }, 5000); // Check every 5 seconds
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

        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <div className="text-lg font-semibold text-blue-900">
            Amount: {currency} {amount.toFixed(2)}
          </div>
        </div>

        {/* Country Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Country *</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            disabled={isProcessing || status === 'success'}
          >
            <option value="">Choose country...</option>
            {countries.map(country => (
              <option key={country} value={country}>
                {country.charAt(0).toUpperCase() + country.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Type Category */}
        {selectedCountry && (
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
        )}

        {/* Payment Type Selection */}
        {selectedCountry && Object.keys(paymentTypes).length > 0 && (
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
              !amount || 
              amount <= 0
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