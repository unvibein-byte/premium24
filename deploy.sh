#!/bin/bash
# Premium24 Automated Deployment Script
# Run this on your Hostinger VPS
# 
# Usage: bash deploy.sh
# 
# Prerequisites:
# - SSH access to VPS
# - Ubuntu 24.04
# - Domain pointing to VPS IP

set -e

echo "======================================"
echo "Premium24 Deployment Script"
echo "======================================"

# Configuration
VPS_IP="72.60.99.29"
DOMAIN_PRIMARY="typingwork24.in"
DOMAIN_SECONDARY="typingwork24.com"
APP_DIR="/srv/premium24"
DB_USER="premium24_user"
DB_NAME="premium24"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}Step 2: Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js already installed"
fi

echo -e "${YELLOW}Step 3: Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
else
    echo "PostgreSQL already installed"
fi
sudo systemctl enable postgresql
sudo systemctl start postgresql

echo -e "${YELLOW}Step 4: Setting up database...${NC}"
# Generate a random password
DB_PASSWORD=$(openssl rand -base64 32)
echo -e "${GREEN}Generated DB Password: ${DB_PASSWORD}${NC}"
echo "Save this password! You'll need it in .env file"

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
DO \$\$ BEGIN
  CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';
EXCEPTION WHEN DUPLICATE_OBJECT THEN
  ALTER USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';
END \$\$;
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo -e "${YELLOW}Step 5: Installing PM2...${NC}"
sudo npm install -g pm2

echo -e "${YELLOW}Step 6: Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
else
    echo "Nginx already installed"
fi
sudo systemctl enable nginx
sudo systemctl start nginx

echo -e "${YELLOW}Step 7: Creating app directory...${NC}"
sudo mkdir -p ${APP_DIR}
sudo chown -R $(whoami):$(whoami) ${APP_DIR}

echo -e "${YELLOW}Step 8: Please copy your code to ${APP_DIR}${NC}"
echo "Option A: Via Git (if you have GitHub set up)"
echo "cd ${APP_DIR} && git clone https://github.com/unvibein-byte/premium24.git ."
echo ""
echo "Option B: Via SCP/SFTP from your local machine"
echo "scp -r \"D:\\android development\\premium24\\*\" root@${VPS_IP}:${APP_DIR}/"
echo ""
read -p "Press Enter when your code is copied to ${APP_DIR}..."

echo -e "${YELLOW}Step 9: Installing backend dependencies...${NC}"
cd ${APP_DIR}/backend
npm install --production

echo -e "${YELLOW}Step 10: Creating backend .env file...${NC}"
if [ ! -f ${APP_DIR}/backend/.env ]; then
    cp ${APP_DIR}/backend/env.example ${APP_DIR}/backend/.env
    
    # Generate secrets
    ACCESS_TOKEN=$(openssl rand -base64 32)
    REFRESH_TOKEN=$(openssl rand -base64 32)
    SETUP_KEY=$(openssl rand -base64 32)
    
    # Update .env with values
    sed -i "s|PORT=4000|PORT=4000|g" ${APP_DIR}/backend/.env
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://${DOMAIN_PRIMARY},https://www.${DOMAIN_PRIMARY},https://${DOMAIN_SECONDARY},https://www.${DOMAIN_SECONDARY}|g" ${APP_DIR}/backend/.env
    sed -i "s|ACCESS_TOKEN_SECRET=.*|ACCESS_TOKEN_SECRET=${ACCESS_TOKEN}|g" ${APP_DIR}/backend/.env
    sed -i "s|REFRESH_TOKEN_SECRET=.*|REFRESH_TOKEN_SECRET=${REFRESH_TOKEN}|g" ${APP_DIR}/backend/.env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}|g" ${APP_DIR}/backend/.env
    sed -i "s|SETUP_API_KEY=.*|SETUP_API_KEY=${SETUP_KEY}|g" ${APP_DIR}/backend/.env
    sed -i "s|ENABLE_MOCK_PAYMENTS=.*|ENABLE_MOCK_PAYMENTS=false|g" ${APP_DIR}/backend/.env
    
    echo -e "${GREEN}.env file created${NC}"
else
    echo ".env already exists, skipping..."
fi

echo -e "${YELLOW}IMPORTANT: Edit .env with your real values:${NC}"
echo "nano ${APP_DIR}/backend/.env"
echo ""
echo "Update these fields:"
echo "  - FIREBASE_PROJECT_ID"
echo "  - FIREBASE_CLIENT_EMAIL"
echo "  - FIREBASE_PRIVATE_KEY"
echo "  - GOOGLE_CLIENT_SECRET"
echo "  - WATCHPAY_API_KEY (get from WatchPay after IP binding)"
echo ""
read -p "Press Enter after updating .env..."

echo -e "${YELLOW}Step 11: Running database schema...${NC}"
PGPASSWORD="${DB_PASSWORD}" psql -U ${DB_USER} -d ${DB_NAME} -h 127.0.0.1 -f ${APP_DIR}/backend/schema.sql

echo -e "${YELLOW}Step 12: Starting backend with PM2...${NC}"
cd ${APP_DIR}/backend
pm2 start index.js --name "premium24-api"
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

echo -e "${YELLOW}Step 13: Building frontend...${NC}"
cd ${APP_DIR}
npm install
npm run build

echo -e "${YELLOW}Step 14: Configuring Nginx...${NC}"
sudo tee /etc/nginx/sites-available/premium24 > /dev/null << 'NGINX_CONFIG'
upstream premium24_api {
    server 127.0.0.1:4000;
}

server {
    listen 80;
    server_name typingwork24.in www.typingwork24.in typingwork24.com www.typingwork24.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name typingwork24.in www.typingwork24.in typingwork24.com www.typingwork24.com;

    ssl_certificate /etc/letsencrypt/live/typingwork24.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/typingwork24.in/privkey.pem;

    root /srv/premium24/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://premium24_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
}
NGINX_CONFIG

sudo ln -sf /etc/nginx/sites-available/premium24 /etc/nginx/sites-enabled/premium24
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo -e "${YELLOW}Step 15: Setting up SSL certificates with Let's Encrypt...${NC}"
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
fi

sudo certbot certonly --nginx -d typingwork24.in -d www.typingwork24.in -d typingwork24.com -d www.typingwork24.com

echo -e "${YELLOW}Step 16: Setting up certificate auto-renewal...${NC}"
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo ""
echo -e "${GREEN}======================================"
echo "Deployment Complete!"
echo "======================================${NC}"
echo ""
echo "Your application is now live!"
echo ""
echo "URLs:"
echo "  - Frontend: https://typingwork24.in"
echo "  - Frontend: https://typingwork24.com"
echo "  - Backend API: https://typingwork24.in/api/"
echo ""
echo "Maintenance Commands:"
echo "  pm2 status                    # View running processes"
echo "  pm2 logs premium24-api        # View backend logs"
echo "  pm2 restart premium24-api     # Restart backend"
echo ""
echo "Next Steps:"
echo "1. Verify SSL certificates installed correctly"
echo "2. Test your live site: https://typingwork24.in"
echo "3. Get your Payment Key from WatchPay"
echo "4. Update WATCHPAY_API_KEY in .env"
echo "5. Restart backend: pm2 restart premium24-api"
echo ""
