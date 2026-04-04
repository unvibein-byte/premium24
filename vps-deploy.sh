#!/bin/bash
# Premium24 VPS Deployment Script
# Run this on your VPS after SSH login

set -e  # Exit on any error

echo "🚀 Premium24 VPS Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

print_status "Running as root - OK"

# Step 1: Update system
echo ""
echo "📦 Step 1: Updating system packages..."
apt update && apt upgrade -y
print_status "System updated"

# Step 2: Install Node.js
echo ""
echo "📦 Step 2: Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt-get install -y nodejs
    print_status "Node.js installed"
else
    print_status "Node.js already installed"
fi

# Step 3: Install PostgreSQL
echo ""
echo "📦 Step 3: Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
print_status "PostgreSQL installed and started"

# Step 4: Install other tools
echo ""
echo "📦 Step 4: Installing additional tools..."
apt install -y git curl wget nano htop
npm install -g pm2
print_status "Additional tools installed"

# Step 5: Set up database
echo ""
echo "🗄️  Step 5: Setting up database..."

# Generate a secure password
DB_PASSWORD=$(openssl rand -base64 12)
echo "Generated database password: $DB_PASSWORD"

sudo -u postgres psql << EOF
CREATE DATABASE IF NOT EXISTS premium24;
CREATE USER IF NOT EXISTS premium24_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
ALTER ROLE premium24_user SET client_encoding TO 'utf8';
ALTER ROLE premium24_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE premium24_user SET default_transaction_deferrable TO on;
ALTER ROLE premium24_user SET default_tzinfo_is_local TO off;
GRANT ALL PRIVILEGES ON DATABASE premium24 TO premium24_user;
EOF

print_status "Database and user created"

# Step 6: Configure PostgreSQL for remote access
echo ""
echo "🔧 Step 6: Configuring PostgreSQL..."

# Backup original config
cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup
cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup

# Update postgresql.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf

# Add to pg_hba.conf
echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/16/main/pg_hba.conf

# Restart PostgreSQL
systemctl restart postgresql
print_status "PostgreSQL configured for remote access"

# Step 7: Clone repository
echo ""
echo "📥 Step 7: Cloning repository..."
if [ ! -d "premium24" ]; then
    git clone https://github.com/unvibein-byte/premium24.git
    print_status "Repository cloned"
else
    print_status "Repository already exists"
fi

cd premium24/backend

# Step 8: Install dependencies
echo ""
echo "📦 Step 8: Installing Node.js dependencies..."
npm install
print_status "Dependencies installed"

# Step 9: Create environment file
echo ""
echo "⚙️  Step 9: Creating environment configuration..."

# Generate secure secrets
ACCESS_SECRET=$(openssl rand -base64 32)
REFRESH_SECRET=$(openssl rand -base64 32)
SETUP_KEY=$(openssl rand -base64 32)

cat > .env << EOF
PORT=4000
CORS_ORIGIN=https://typingwork24.com,https://www.typingwork24.com,https://typingwork24.in,https://www.typingwork24.in,capacitor://localhost,http://localhost

ACCESS_TOKEN_SECRET=$ACCESS_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_SECRET
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30

DATABASE_URL=postgresql://premium24_user:$DB_PASSWORD@127.0.0.1:5432/premium24
DB_SSL=false

FIREBASE_KEY_FILE=./firebase-key.json

SETUP_API_KEY=$SETUP_KEY

ENABLE_MOCK_PAYMENTS=false
WATCHPAY_BASE_URL=https://merchant.watchglb.com
WATCHPAY_API_KEY=CTNB4ATD5XSZMKYFST1ED1HHY9JEUKEP
WATCHPAY_MERCHANT_ID=100528114
WATCHPAY_CURRENCY=INR
EOF

print_status "Environment file created"

# Step 10: Instructions for Firebase key
echo ""
print_warning "Step 10: Firebase Key Required"
echo ""
echo "You need to upload your Firebase service account key:"
echo "1. Download from: https://console.firebase.google.com/project/typingwork24/settings/serviceaccounts/adminsdk"
echo "2. Click 'Generate New Private Key'"
echo "3. Save as firebase-key.json"
echo "4. Upload to VPS: scp firebase-key.json root@72.60.99.29:~/premium24/backend/"
echo ""
read -p "Press Enter after uploading firebase-key.json..."

# Step 11: Initialize database
echo ""
echo "🗄️  Step 11: Initializing database..."
sleep 2

# Try to initialize database
if curl -s -H "x-setup-key: $SETUP_KEY" http://localhost:4000/api/setup/init > /dev/null 2>&1; then
    print_status "Database initialized"
else
    print_warning "Database initialization failed (backend not started yet)"
fi

# Step 12: Start backend with PM2
echo ""
echo "🚀 Step 12: Starting backend with PM2..."
pm2 stop premium24-backend 2>/dev/null || true
pm2 delete premium24-backend 2>/dev/null || true
pm2 start index.js --name "premium24-backend"
pm2 save
pm2 startup
print_status "Backend started with PM2"

# Step 13: Test the setup
echo ""
echo "🧪 Step 13: Testing setup..."

# Wait a moment for backend to start
sleep 3

# Test health endpoint
if curl -s http://localhost:4000/api/health | grep -q "ok"; then
    print_status "Health check passed"
else
    print_warning "Health check failed"
fi

# Test database connection
if sudo -u postgres psql -d premium24 -c "SELECT 1" > /dev/null 2>&1; then
    print_status "Database connection OK"
else
    print_warning "Database connection failed"
fi

# Final summary
echo ""
echo "=================================="
print_status "DEPLOYMENT COMPLETE!"
echo ""
echo "📊 Database Details:"
echo "   Database: premium24"
echo "   User: premium24_user"
echo "   Password: $DB_PASSWORD"
echo "   Connection: postgresql://premium24_user:$DB_PASSWORD@127.0.0.1:5432/premium24"
echo ""
echo "🔑 Setup Key: $SETUP_KEY"
echo ""
echo "🌐 API Endpoints:"
echo "   Health: http://localhost:4000/api/health"
echo "   Setup: http://localhost:4000/api/setup/init"
echo ""
echo "📝 Useful Commands:"
echo "   pm2 status                    # Check backend status"
echo "   pm2 logs premium24-backend    # View logs"
echo "   pm2 restart premium24-backend # Restart backend"
echo "   psql -U premium24_user -d premium24 -h 127.0.0.1  # Connect to database"
echo ""
echo "🗄️  Database Tables:"
echo "   psql -U premium24_user -d premium24 -h 127.0.0.1 -c '\dt'"
echo ""
print_warning "Don't forget to:"
echo "1. Upload firebase-key.json to ~/premium24/backend/"
echo "2. Configure Nginx for domain (optional)"
echo "3. Set up SSL certificate (recommended)"
echo "4. Configure firewall rules"
echo ""
echo "🎉 Ready to serve requests at http://72.60.99.29:4000"
