# Premium24 Backend Deployment

## Features Implemented
- Google OAuth login
- User registration/login with optional password
- WhatsApp number storage
- Premium user status (admin controllable)
- Wallet system with balance and referral wallet
- Withdrawal system with minimum amounts
- Plans system
- Referral system with rewards

## Database Schema
The schema.sql file contains all necessary tables and sample data.

## Environment Variables
Copy .env.example to .env and fill in the values:
- DATABASE_URL: PostgreSQL connection string
- ACCESS_TOKEN_SECRET: Random secret for JWT
- REFRESH_TOKEN_SECRET: Another random secret
- FIREBASE_PROJECT_ID: Firebase project ID
- FIREBASE_CLIENT_EMAIL: Firebase service account client email
- FIREBASE_PRIVATE_KEY: Firebase service account private key (`\n` escaped in env)
- CORS_ORIGIN: Include web + localhost + capacitor origins

Production domains used in this project:
- Frontend/API domain: `https://typingwork24.com`
- Optional legacy domain: `https://typingwork24.in`

## Deployment Steps
1. Upload the backend folder to your VPS
2. Install dependencies: `npm install`
3. Copy .env.example to .env and configure
4. Initialize database first-time: POST to /api/setup/init with header `x-setup-key: <SETUP_API_KEY>`
5. Start with PM2: `pm2 start index.js --name premium24`

## API Endpoints
- POST /api/auth/register - Register user
- POST /api/auth/login - Login user
- POST /api/auth/google - Firebase Google sign-in login
- POST /api/auth/refresh - Refresh token
- POST /api/auth/logout - Logout
- GET /api/auth/me - Get current user profile
- PUT /api/user/profile - Update profile (WhatsApp)
- POST /api/admin/premium - Admin: toggle premium status
- POST /api/admin/make-admin - Admin: promote user to admin
- POST /api/wallet/withdraw - Request withdrawal
- GET /api/plans - Get available plans
- POST /api/referral - Add referral
- POST /api/setup/init - One-time DB initialization (requires `x-setup-key`)
- POST /api/admin/init-db - Initialize database (admin only)