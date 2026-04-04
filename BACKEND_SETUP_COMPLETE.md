# 🚀 COMPLETE BACKEND SETUP - Premium24

## What I Fixed

✅ **Backend Code Updated** - Now supports loading Firebase credentials from file  
✅ **Environment File Updated** - Ready for Firebase key file  
✅ **User ID Storage** - Already built in (user_id stored with payments when bearer token provided)  
✅ **Payment System** - MOCK MODE ready, real payments when database connected

## What You Need To Do (3 Simple Steps)

### Step 1: Download Firebase Key (5 minutes)

```
1. Open: https://console.firebase.google.com/project/typingwork24/settings/serviceaccounts/adminsdk
2. Click "Generate New Private Key" (red button)
3. JSON file downloads
4. Save as: backend/firebase-key.json
5. ⚠️ NEVER commit this file to Git (already in .gitignore)
```

### Step 2: Set Up Database (Choose One)

**OPTION A: Quick Local Setup** (For Development)
```powershell
# Install PostgreSQL Community Edition
# Download: https://www.postgresql.org/download/windows/
# During install, remember the password you set

# Update DATABASE_URL in backend/.env:
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/premium24
```

**OPTION B: Hostinger VPS** (For Production)
```powershell
# SSH to VPS and follow: HOSTINGER_VPS_POSTGRESQL_SETUP.md
# Then update .env:
# DATABASE_URL=postgresql://premium24_user:PASSWORD@72.60.99.29:5432/premium24
```

### Step 3: Start Backend

```powershell
cd backend

# Install dependencies (first time only)
npm install

# Start server (will auto-restart on file changes)
npm run dev
```

## Expected Output

When everything works, you'll see:

```
[nodemon] starting `node index.js`
[Firebase] ✅ Loaded credentials from file: ./firebase-key.json
Premium24 backend listening on port 4000
[payment] *** MOCK MODE ENABLED - Development Payment ***
[payment] Mock order created: { orderId: '...', amount: '499.00', currency: 'INR', userId: 123 }
```

## Testing the System

### Test 1: Backend Health Check
```bash
curl http://localhost:4000/api/health
# Response: { "status": "ok" } or { "status": "error", "db": "disconnected" }
```

### Test 2: User Registration
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# Response: { "user": { "id": 1, ... }, "accessToken": "...", "refreshToken": "..." }
```

### Test 3: Create Payment with User ID
```bash
# Use the accessToken from step 2
curl -X POST http://localhost:4000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"amount": 499, "payType": 101}'

# Response: { "orderId": "P24_...", "paymentUrl": "...", "userId": 1 }
# ✅ Notice userId is now included!
```

## File Structure

```
backend/
├── .env                    ← Configuration (don't commit)
├── firebase-key.json       ← Firebase credentials (DON'T COMMIT - in .gitignore)
├── index.js               ← Backend server (UPDATED to load Firebase from file)
├── schema.sql             ← Database schema
├── package.json
└── node_modules/          ← Dependencies
```

## Troubleshooting

### Problem: "Firebase auth disabled"
**Solution:**
- [ ] Verify firebase-key.json exists in backend/ folder
- [ ] Check it has content (not empty)
- [ ] Restart backend: `npm run dev`

### Problem: "DB unavailable"
**Solution:**
- [ ] PostgreSQL not running
- [ ] Option 1: Install + start PostgreSQL locally
- [ ] Option 2: Update DATABASE_URL to use VPS IP (72.60.99.29)
- [ ] Run: `curl -H "x-setup-key: e47c58e3-d7b0-4e9e-b5c3-1a2f8e4d6c7b" http://localhost:4000/api/setup/init`

### Problem: "Port 4000 already in use"
**Solution:**
```powershell
# Find process using port 4000
netstat -ano | findstr :4000

# Kill it (replace PID with actual number)
taskkill /PID 12345 /F
```

## What's Working Now

| Feature | Status | Notes |
|---------|--------|-------|
| Firebase Auth | ✅ Ready | Needs key file |
| Email/Password Login | ✅ Ready | Database needed |
| Google Login | ✅ Ready | Needs key file |
| User Creation | ✅ Ready | Stores all fields |
| Payments | ✅ Ready | MOCK mode enabled |
| User ID in Payments | ✅ Ready | Must pass Bearer token |
| Wallet/Referrals | ✅ Ready | Database needed |
| Premium Features | ✅ Ready | Database needed |

## Data Stored Per User

When users create account or login, Premium24 stores:
- ✅ `id` - Unique user ID
- ✅ `username` - Display name
- ✅ `email` - Email address
- ✅ `google_id` - Google account ID (if Google login)
- ✅ `whatsapp_number` - Optional WhatsApp contact
- ✅ `is_premium` - Premium status (true/false)
- ✅ `wallet_balance` - Wallet money
- ✅ `referral_wallet` - Referral earnings
- ✅ `min_withdrawal` - Minimum withdrawal amount
- ✅ `created_at` - Account creation date

All user data is stored in `auth_users` table in database.

## Next Steps

1. ✅ Download firebase-key.json from Firebase Console
2. ✅ Set up PostgreSQL (local or VPS)
3. ✅ Start backend: `npm run dev`
4. ✅ Test endpoints (see Testing section above)
5. ✅ Connect frontend to http://localhost:4000
6. ✅ When ready for production, update ENABLE_MOCK_PAYMENTS=false

## Support Files

- [FIREBASE_DATABASE_SETUP.md](FIREBASE_DATABASE_SETUP.md) - Detailed setup guide
- [HOSTINGER_VPS_POSTGRESQL_SETUP.md](HOSTINGER_VPS_POSTGRESQL_SETUP.md) - VPS database setup
- [QUICK_START_BACKEND.md](QUICK_START_BACKEND.md) - Quick reference

---

**Current Status**: Backend ready, waiting for Firebase key file and database connection
