# Backend Environment Setup Guide - Premium24

## Issues Found

1. **Firebase credentials are not loading properly**
   - The private key in `.env` has literal `\n` characters instead of real newlines
   - dotenv can't parse multi-line values correctly in standard .env format

2. **Database connection failing**
   - PostgreSQL is not running on 127.0.0.1:5432
   - Need to either install PostgreSQL locally OR use Hostinger VPS

3. **User ID in payments**
   - ✅ Already set up correctly - backend extracts user_id from bearer token
   - Issue: Frontend needs to pass Bearer token when creating orders

## Solution

### Step 1: Get Real Firebase Credentials

1. Go to: https://console.firebase.google.com/project/typingwork24/settings/serviceaccounts/adminsdk
2. Click "Generate New Private Key"
3. Save the JSON file locally
4. Open the JSON file - you'll see real newlines in the private key

### Step 2: Create Proper .env File

The issue is that `.env` files can't handle multi-line private keys well. Use this approach:

**Option A: Store Firebase Key in Separate File (RECOMMENDED)**

```bash
# Create backend/firebase-key.json (copy from Firebase Console directly)
```

Then update `backend/.env`:
```
FIREBASE_KEY_FILE=./firebase-key.json
```

And update `backend/index.js` to load the file instead of env var.

**Option B: Properly Escape Private Key in .env**

Replace in `.env`:
```
FIREBASE_PRIVATE_KEY_PATH=./firebase-key.json
```

Or use actual newlines (not \n) in .env:
```
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
[actual key content with real line breaks]
-----END PRIVATE KEY-----
```

### Step 3: Update index.js to Load Firebase Key Properly

**Add this code near the top of backend/index.js (after imports):**

```javascript
// Load Firebase private key from file if specified
let FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || "";
if (process.env.FIREBASE_KEY_FILE && !FIREBASE_PRIVATE_KEY) {
  try {
    const fs = await import('fs');
    const keyFilePath = process.env.FIREBASE_KEY_FILE;
    if (fs.existsSync(keyFilePath)) {
      const keyData = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));
      FIREBASE_PROJECT_ID = keyData.project_id;
      FIREBASE_CLIENT_EMAIL = keyData.client_email;
      FIREBASE_PRIVATE_KEY = keyData.private_key;
      console.log('[Firebase] Loaded credentials from file:', keyFilePath);
    }
  } catch (error) {
    console.warn('[Firebase] Could not load key file:', error.message);
  }
}
```

### Step 4: Set Up PostgreSQL

**Quick Option - Use Local PostgreSQL:**

```powershell
# Windows: Download and install PostgreSQL from https://www.postgresql.org/download/windows/
# Or use Docker:
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# Then initialize database:
# From backend directory, with server running:
curl -H "x-setup-key: e47c58e3-d7b0-4e9e-b5c3-1a2f8e4d6c7b" \
  http://localhost:4000/api/setup/init
```

**Production Option - Use Hostinger VPS:**

See `HOSTINGER_VPS_POSTGRESQL_SETUP.md` and update:
```
DATABASE_URL=postgresql://premium24_user:YOUR_PASSWORD@72.60.99.29:5432/premium24
```

### Step 5: Test Everything

```powershell
cd backend

# Install dependencies
npm install

# Start backend
npm run dev

# In another terminal, test:
curl http://localhost:4000/api/health

# Initialize database (if needed):
curl -H "x-setup-key: e47c58e3-d7b0-4e9e-b5c3-1a2f8e4d6c7b" \
  http://localhost:4000/api/setup/init
```

## Current Status

```
✅ Backend Server: Ready to run on http://localhost:4000
❌ Firebase: Not loading (needs real key file or proper formatting)
❌ Database: Not running (needs PostgreSQL installed)
⚠️ Payments: Ready with MOCK MODE enabled
✅ User Creation: Ready (Google login + email/password)
✅ User Profiles: Will work once database is up
```

## Testing Payment Orders with User ID

**When creating payment orders, include Bearer token:**

```bash
# Register/login to get token
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Response: { "user": {...}, "accessToken": "...", "refreshToken": "..." }

# Use token to create order (user_id will be stored):
curl -X POST http://localhost:4000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"amount":499,"payType":101}'
```

## Files You Need

1. **backend/firebase-key.json** - Downloaded from Firebase Console (**DO NOT COMMIT TO GIT**)
2. **backend/.env** - Already created, update with:
   ```
   FIREBASE_KEY_FILE=./firebase-key.json
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/premium24
   ```
3. **PostgreSQL running** - Either locally or on VPS

## Quick Start Script

When everything is set up:

```powershell
cd backend
npm install
npm run dev
```

Backend will start on http://localhost:4000 with:
- ✅ Firebase authentication
- ✅ User management  
- ✅ Payment orders (with user_id stored when token provided)
- ✅ Wallet & referrals
- ✅ Premium features

## Troubleshooting

### "Firebase auth disabled" error
- [ ] Download firebase-key.json from Firebase Console
- [ ] Save to backend/firebase-key.json
- [ ] Update .env: `FIREBASE_KEY_FILE=./firebase-key.json`
- [ ] Restart backend

### "DB unavailable" error
- [ ] Install PostgreSQL locally
- [ ] Or update DATABASE_URL to use Hostinger VPS IP
- [ ] Run setup endpoint: `curl -H "x-setup-key: ..." http://localhost:4000/api/setup/init`

### User ID is null in payments
- [ ] Pass Bearer token in Authorization header when creating orders
- [ ] Token should come from /api/auth/register or /api/auth/google endpoints
