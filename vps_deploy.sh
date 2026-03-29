#!/bin/bash
# Premium24 VPS Deployment Script
# Run this on your Hostinger VPS

set -e

VPS_USER="root"
VPS_IP="${1:-your_vps_ip}"
BACKEND_DIR="/opt/premium24-backend"
FRONTEND_DIR="/var/www/premium24-web"

echo "=== Deploying Premium24 to VPS ==="
echo "VPS: $VPS_IP"

# 1. Create backend directory and deploy
echo "📦 Deploying backend..."
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${BACKEND_DIR}"
scp -r "D:\\android development\\premium24\\backend" ${VPS_USER}@${VPS_IP}:${BACKEND_DIR}/..

# 2. Install backend dependencies on VPS
echo "📚 Installing backend dependencies..."
ssh ${VPS_USER}@${VPS_IP} "cd ${BACKEND_DIR} && npm install --production"

# 3. Create backend .env with proper values
echo "⚙️ Setting up backend environment..."
ssh ${VPS_USER}@${VPS_IP} "cat > ${BACKEND_DIR}/.env << 'EOF'
PORT=4000
CORS_ORIGIN=https://yourdomam.com,https://www.yourdomain.com
ACCESS_TOKEN_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgresql://premium24_user:YOUR_DB_PASSWORD@127.0.0.1:5432/premium24
DB_SSL=false
FIREBASE_PROJECT_ID=typingwork24
FIREBASE_CLIENT_EMAIL=YOUR_SERVICE_ACCOUNT_EMAIL
FIREBASE_PRIVATE_KEY=YOUR_PRIVATE_KEY_WITH_ESCAPED_NEWLINES
SETUP_API_KEY=$(openssl rand -base64 32)
GOOGLE_CLIENT_ID=999558251004-og9rn5p3ojthq0a9cgbac9ef20grg3sb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
WATCHPAY_BASE_URL=https://merchant.watchglb.com
WATCHPAY_MERCHANT_ID=100528114
WATCHPAY_CURRENCY=INR
WATCHPAY_API_KEY=CTNB4ATD5XSZMKYFST1ED1HHY9JEUKEP
EOF"

# 4. Start backend with PM2
echo "🚀 Starting backend with PM2..."
ssh ${VPS_USER}@${VPS_IP} "cd ${BACKEND_DIR} && npm install -g pm2 && pm2 start index.js --name premium24-backend && pm2 save && pm2 startup"

echo "✅ Backend deployed and running!"
echo "Backend URL: http://${VPS_IP}:4000"
echo ""
echo "📝 Next steps:"
echo "1. Update database credentials in .env"
echo "2. Add Firebase credentials"
echo "3. Configure your domain DNS to point to ${VPS_IP}"
