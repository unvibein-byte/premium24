import React, { useState, useEffect } from 'react';
import './WalletScreen.css';

const WalletScreen = ({ currentUser, API_BASE_URL }) => {
  const [amount, setAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const balance = currentUser?.wallet_balance || 0;
  const minWithdrawal = currentUser?.min_withdrawal || 100;
  const lifetimeEarnings = balance; // You can track this separately

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!API_BASE_URL) return;
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/activity`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setTransactions(Array.isArray(data) ? data.slice(0, 5) : []);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      }
    };
    fetchTransactions();
  }, [API_BASE_URL]);

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (parseFloat(amount) < minWithdrawal) {
      alert(`Minimum withdrawal amount is ₹${minWithdrawal}`);
      return;
    }
    if (parseFloat(amount) > balance) {
      alert('Insufficient balance');
      return;
    }
    if (!API_BASE_URL) return;
    
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/wallet/withdraw`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });
      if (response.ok) {
        alert('Withdrawal request submitted successfully!');
        setAmount('');
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit withdrawal');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Failed to submit withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-container">
      {/* Header */}
      <div className="wallet-header">
        <button className="header-icon back-icon">←</button>
        <div className="header-center">
          <div className="header-icon wallet-icon">💰</div>
          <span className="header-title">My Wallet</span>
        </div>
        <div className="header-right">
          <button className="header-icon bell-icon">🔔</button>
          <button className="header-icon lang-icon">EN</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="wallet-content">
        {/* Balance Card */}
        <div className="balance-card">
          <div className="balance-card-inner">
            <div className="balance-label">Available Balance</div>
            <div className="balance-amount-display">₹ {balance.toFixed(2)}</div>
            <div className="balance-subtitle">Total Earnings: ₹ {lifetimeEarnings.toFixed(2)}</div>
          </div>
          <div className="balance-card-bg"></div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="action-item">
            <div className="action-icon">💳</div>
            <span>Banks</span>
          </div>
          <div className="action-item">
            <div className="action-icon">📊</div>
            <span>History</span>
          </div>
          <div className="action-item">
            <div className="action-icon">💰</div>
            <span>Rewards</span>
          </div>
        </div>

        {/* Withdrawal Form */}
        <div className="withdrawal-section">
          <h3 className="section-title">Request Withdrawal</h3>
          
          <div className="input-wrapper">
            <label>Amount (₹)</label>
            <div className="input-field">
              <span className="currency-symbol">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="amount-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="payment-methods">
            <p className="methods-label">Payment Methods</p>
            <div className="methods-grid">
              <div className="method-badge">UPI</div>
              <div className="method-badge">GPay</div>
              <div className="method-badge">PhonePe</div>
              <div className="method-badge">Paytm</div>
            </div>
          </div>

          <div className="info-box">
            <div className="info-item">
              <span className="info-label">Min Amount:</span>
              <span className="info-value">₹ {minWithdrawal}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Available:</span>
              <span className="info-value">₹ {balance.toFixed(2)}</span>
            </div>
          </div>

          <button 
            className="withdraw-btn" 
            onClick={handleWithdraw}
            disabled={loading || !amount}
          >
            {loading ? 'Processing...' : 'Request Withdrawal'}
          </button>

          <button className="add-bank-btn">
            + Add Bank Account
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="transactions-section">
          <h3 className="section-title">Recent Activity</h3>
          {transactions.length > 0 ? (
            <div className="transactions-list">
              {transactions.map((tx, index) => (
                <div key={tx.id || index} className="transaction-item">
                  <div className="tx-icon">
                    {tx.event_type === 'withdrawal' ? '📤' : '📥'}
                  </div>
                  <div className="tx-details">
                    <div className="tx-type">{tx.event_type}</div>
                    <div className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className={`tx-amount ${tx.event_type === 'withdrawal' ? 'debit' : 'credit'}`}>
                    {tx.event_type === 'withdrawal' ? '-' : '+'} ₹ 0.00
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No transactions yet</p>
              <span>Your transactions will appear here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletScreen;