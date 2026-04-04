# Quick Start - Backend Setup for Premium24

## ✅ What's Already Done

Your `.env` file now has:
- ✅ **Firebase**: typingwork24 project credentials configured
- ✅ **WatchPay**: API key already set (WATCHPAY_API_KEY=CTNB4ATD5XSZMKYFST1ED1HHY9JEUKEP)
- ✅ **Token Secrets**: Already generated (ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET)
- ✅ **Setup Key**: Configured for /api/setup/init endpoint

## 🔴 What Needs to Be Done

### 1. **Database Connection** (CRITICAL)

The app is trying to connect to `127.0.0.1:5432` (localhost) but PostgreSQL is not running.

**Option A: Use Local PostgreSQL** (Quick for development)
```powershell
# Install PostgreSQL locally or use Docker
# Then update .env:
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/premium24
```

**Option B: Use Hostinger VPS** (For production)
```
1. SSH into: ssh root@72.60.99.29
2. Follow guide: HOSTINGER_VPS_POSTGRESQL_SETUP.md
3. Update .env:
   DATABASE_URL=postgresql://premium24_user:YOUR_PASSWORD@72.60.99.29:5432/premium24
```

### 2. **Run Backend**
```powershell
cd backend
npm install  # First time only
npm run dev
```

## 🧪 Test the Setup

Once backend is running, test with curl:

```powershell
# Test health
curl http://localhost:4000/api/health

# Test mock payment (no DB needed)
curl -X POST http://localhost:4000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "planId": 1}'
```

## 📋 Current Status

```
Backend Port: 4000
Firebase: ✅ Configured (typingwork24)
WatchPay: ✅ Configured (Mock Mode Enabled)
Database: ❌ NEEDS CONNECTION
```

## 🚀 Next Step

**Choose ONE option below:**

### **QUICK (Local Development)**
```bash
cd backend
npm run dev
# Backend will run, tests will work with mock payments
# Database operations will fail until PostgreSQL is running
```

### **PRODUCTION (Hostinger VPS)**
```bash
# 1. SSH to VPS and run setup
ssh root@72.60.99.29
# Follow: HOSTINGER_VPS_POSTGRESQL_SETUP.md

# 2. Update .env with VPS credentials
# 3. Test connection
psql -h 72.60.99.29 -U premium24_user -d premium24

# 4. Run backend
npm run dev
```

## ⚠️ Common Issues

### "ECONNREFUSED 127.0.0.1:5432"
- PostgreSQL is not running locally
- Solution: Install PostgreSQL or change DATABASE_URL to use VPS

### "Firebase auth disabled"
- This is **OK for development** if you don't need Firebase
- Backend still works with email/password login

### "DB unavailable, order not stored"
- Expected if no database
- Payments work in MOCK MODE (ENABLE_MOCK_PAYMENTS=true)
- Set to false when real database is ready

## 📞 Support Files

- See: `HOSTINGER_VPS_POSTGRESQL_SETUP.md` - Full VPS database setup
- See: `backend/.env` - All configuration options
- See: `backend/schema.sql` - Database structure
