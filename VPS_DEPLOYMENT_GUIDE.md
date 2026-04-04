# VPS Deployment Guide - Premium24 Backend

## VPS Details
- **IP**: 72.60.99.29
- **Hostname**: srv992795.hstgr.cloud
- **OS**: Ubuntu 24.04
- **Domain**: typingwork24.com

## Step 1: SSH into VPS

```bash
ssh root@72.60.99.29
# or
ssh root@srv992795.hstgr.cloud
```

## Step 2: Update System & Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18+ (LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Git
apt install -y git

# Install PM2 (process manager)
npm install -g pm2

# Verify installations
node --version
npm --version
psql --version
git --version
pm2 --version
```

## Step 3: Set Up PostgreSQL Database

```bash
# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL shell:
CREATE DATABASE premium24;
CREATE USER premium24_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
ALTER ROLE premium24_user SET client_encoding TO 'utf8';
ALTER ROLE premium24_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE premium24_user SET default_transaction_deferrable TO on;
ALTER ROLE premium24_user SET default_tzinfo_is_local TO off;
GRANT ALL PRIVILEGES ON DATABASE premium24 TO premium24_user;
\q
```

## Step 4: Configure PostgreSQL for Remote Access

```bash
# Edit PostgreSQL config
nano /etc/postgresql/16/main/postgresql.conf

# Find and change:
listen_addresses = '*'

# Save and exit (Ctrl+X, Y, Enter)

# Edit HBA config
nano /etc/postgresql/16/main/pg_hba.conf

# Add at the end:
host    all             all             0.0.0.0/0               md5

# Restart PostgreSQL
systemctl restart postgresql
```

## Step 5: Clone and Deploy Backend

```bash
# Clone your repository
git clone https://github.com/unvibein-byte/premium24.git
cd premium24/backend

# Install dependencies
npm install

# Create production .env file
nano .env
```

## Step 6: Configure Production Environment

Create `.env` file with:

```env
PORT=4000
CORS_ORIGIN=https://typingwork24.com,https://www.typingwork24.com,https://typingwork24.in,https://www.typingwork24.in,capacitor://localhost,http://localhost

ACCESS_TOKEN_SECRET=your_long_random_secret_here
REFRESH_TOKEN_SECRET=your_different_random_secret_here
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30

# VPS PostgreSQL Database
DATABASE_URL=postgresql://premium24_user:your_secure_password_here@127.0.0.1:5432/premium24
DB_SSL=false

# Firebase (upload firebase-key.json to VPS)
FIREBASE_KEY_FILE=./firebase-key.json

# Setup key for database initialization
SETUP_API_KEY=your_setup_key_here

# WatchPay (Production)
ENABLE_MOCK_PAYMENTS=false
WATCHPAY_BASE_URL=https://merchant.watchglb.com
WATCHPAY_API_KEY=CTNB4ATD5XSZMKYFST1ED1HHY9JEUKEP
WATCHPAY_MERCHANT_ID=100528114
WATCHPAY_CURRENCY=INR
```

## Step 7: Upload Firebase Key

```bash
# From your local machine, upload the Firebase key
scp backend/firebase-key.json root@72.60.99.29:~/premium24/backend/
```

## Step 8: Initialize Database

```bash
# Initialize database schema
curl -H "x-setup-key: your_setup_key_here" \
  http://localhost:4000/api/setup/init
```

## Step 9: Start Backend with PM2

```bash
# Start the application
pm2 start index.js --name "premium24-backend"

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it gives you

# Check status
pm2 status
pm2 logs premium24-backend
```

## Step 10: Configure Nginx (Optional but Recommended)

```bash
# Install Nginx
apt install -y nginx

# Create site configuration
nano /etc/nginx/sites-available/premium24

# Add this content:
server {
    listen 80;
    server_name typingwork24.com www.typingwork24.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
ln -s /etc/nginx/sites-available/premium24 /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

## Step 11: Test Database Tables

```bash
# Connect to database
psql -U premium24_user -d premium24 -h 127.0.0.1

# List all tables
\dt

# View table structure
\d auth_users
\d payment_orders
\d plans
\d withdrawals
\d referrals

# View sample data
SELECT * FROM auth_users LIMIT 5;
SELECT * FROM payment_orders LIMIT 5;

# Exit
\q
```

## Step 12: Test API Endpoints

```bash
# Test health
curl http://localhost:4000/api/health

# Test with domain (if Nginx configured)
curl https://typingwork24.com/api/health

# Test database initialization
curl -H "x-setup-key: your_setup_key_here" \
  http://localhost:4000/api/setup/init
```

## Monitoring Commands

```bash
# Check PM2 status
pm2 status
pm2 logs premium24-backend

# Check PostgreSQL
systemctl status postgresql

# Check Nginx (if installed)
systemctl status nginx

# View logs
tail -f /var/log/postgresql/postgresql-16-main.log
```

## Backup Commands

```bash
# Database backup
pg_dump -U premium24_user -h 127.0.0.1 premium24 > backup_$(date +%Y%m%d_%H%M%S).sql

# PM2 logs backup
pm2 logs premium24-backend --lines 1000 > pm2_logs_$(date +%Y%m%d_%H%M%S).txt
```

## Troubleshooting

### Backend not starting
```bash
# Check PM2 logs
pm2 logs premium24-backend

# Check if port 4000 is in use
netstat -tlnp | grep :4000

# Restart backend
pm2 restart premium24-backend
```

### Database connection issues
```bash
# Test database connection
psql -U premium24_user -d premium24 -h 127.0.0.1 -c "SELECT 1"

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-16-main.log
```

### Firebase issues
```bash
# Check if firebase-key.json exists
ls -la firebase-key.json

# Test Firebase loading
pm2 logs premium24-backend | grep Firebase
```

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Update SETUP_API_KEY to a secure random value
- [ ] Configure firewall (ufw)
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Regular backups
- [ ] Monitor logs

## Quick Deployment Script

Create `deploy.sh` in your project root:

```bash
#!/bin/bash
echo "🚀 Deploying Premium24 Backend to VPS..."

# Build and deploy
npm run build 2>/dev/null || echo "No build script found, skipping..."

# Restart PM2
pm2 restart premium24-backend || pm2 start index.js --name "premium24-backend"

echo "✅ Deployment complete!"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs premium24-backend"
```

Make it executable: `chmod +x deploy.sh`
