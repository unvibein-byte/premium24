# Premium24 Deployment Guide - Hostinger VPS

## VPS Information
- **IP Address:** 72.60.99.29
- **Domain:** typingwork24.in / typingwork24.com
- **OS:** Ubuntu 24.04
- **SSH Host:** 72.60.99.29 (or srv992795.hstgr.cloud)

---

## Prerequisites

Before deploying, ensure you have:

1. **SSH Access** - Log in via Hostinger control panel
   ```bash
   ssh root@72.60.99.29
   ```

2. **Real WatchPay Payment Key** - Contact WatchPay support with:
   - Merchant ID: 100528114
   - Server IP: 72.60.99.29
   - They will provide your Payment Key

3. **Database Password** - Generate a strong one:
   ```bash
   openssl rand -base64 32
   ```

---

## Step 1: Initial VPS Setup (Run Once)

```bash
# 1. SSH into VPS
ssh root@72.60.99.29

# 2. Update system
sudo apt update && sudo apt upgrade -y

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 5. Start PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 6. Create database and user
sudo -u postgres psql << 'EOF'
CREATE DATABASE premium24;
CREATE USER premium24_user WITH ENCRYPTED PASSWORD 'USE_YOUR_GENERATED_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE premium24 TO premium24_user;
\q
EOF

# 7. Install PM2 (process manager)
sudo npm install -g pm2

# 8. Install Nginx (for reverse proxy)
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Step 2: Deploy Backend

```bash
# 1. Create directory for your app
sudo mkdir -p /srv/premium24
sudo chown -R $USER:$USER /srv/premium24
cd /srv/premium24

# 2. Clone or copy your code to server
# Option A: If you have GitHub set up
git clone https://github.com/unvibein-byte/premium24.git .

# Option B: Upload manually via SFTP/SCP
# From your local machine:
# scp -r "D:\android development\premium24\*" root@72.60.99.29:/srv/premium24/

# 3. Install backend dependencies
cd /srv/premium24/backend
npm install --production

# 4. Setup backend .env file
cp env.example .env

# 5. Edit .env with your real values
nano .env
```

**Update these in .env:**
```
PORT=4000
CORS_ORIGIN=https://typingwork24.in,https://www.typingwork24.in,https://typingwork24.com,https://www.typingwork24.com
ACCESS_TOKEN_SECRET=YOUR_RANDOM_SECRET
REFRESH_TOKEN_SECRET=YOUR_RANDOM_SECRET
DATABASE_URL=postgresql://premium24_user:YOUR_DB_PASSWORD@127.0.0.1:5432/premium24
WATCHPAY_API_KEY=YOUR_REAL_PAYMENT_KEY_FROM_WATCHPAY
ENABLE_MOCK_PAYMENTS=false
```

# 6. Run database schema
psql "postgresql://premium24_user:YOUR_DB_PASSWORD@127.0.0.1:5432/premium24" -f schema.sql

# 7. Start backend with PM2
pm2 start index.js --name "premium24-api"
pm2 save
pm2 startup
```

---

## Step 3: Build & Deploy Frontend

```bash
# 1. Go to project root
cd /srv/premium24

# 2. Install frontend dependencies
npm install

# 3. Build frontend
npm run build

# 4. Frontend built files are now in: /srv/premium24/dist
```

---

## Step 4: Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/premium24
```

**Paste this configuration:**

```nginx
# Backend API
upstream premium24_api {
    server 127.0.0.1:4000;
}

# HTTPS redirect and main site
server {
    listen 80;
    server_name typingwork24.in www.typingwork24.in typingwork24.com www.typingwork24.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name typingwork24.in www.typingwork24.in typingwork24.com www.typingwork24.com;

    # SSL certificates (get from Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/typingwork24.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/typingwork24.in/privkey.pem;

    # Frontend static files
    root /srv/premium24/dist;
    index index.html;

    # Frontend routes - serve index.html for SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
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

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
}
```

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/premium24 /etc/nginx/sites-enabled/premium24
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 5: Setup SSL Certificates

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificates for your domains
sudo certbot certonly --nginx -d typingwork24.in -d www.typingwork24.in -d typingwork24.com -d www.typingwork24.com

# Auto-renew (optional)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Step 6: Verify Deployment

```bash
# Check backend is running
pm2 status

# Check logs
pm2 logs premium24-api

# Check Nginx
sudo systemctl status nginx

# Test backend API
curl https://typingwork24.in/api/health

# Test frontend
# Open https://typingwork24.in in browser
```

---

## Maintenance Commands

```bash
# View logs
pm2 logs premium24-api

# Restart backend
pm2 restart premium24-api

# Stop backend
pm2 stop premium24-api

# Update frontend (after code changes)
cd /srv/premium24
git pull
npm run build
sudo systemctl reload nginx

# View running processes
pm2 status
```

---

## Enable Real WatchPay Payments

Once you have your Payment Key from WatchPay:

1. SSH into VPS:
   ```bash
   ssh root@72.60.99.29
   ```

2. Edit .env:
   ```bash
   nano /srv/premium24/backend/.env
   ```

3. Update:
   ```
   WATCHPAY_API_KEY=YOUR_REAL_KEY_FROM_WATCHPAY
   ENABLE_MOCK_PAYMENTS=false
   ```

4. Restart backend:
   ```bash
   pm2 restart premium24-api
   ```

---

## Troubleshooting

### Backend not starting?
```bash
pm2 logs premium24-api
```

### Database connection error?
```bash
psql -U premium24_user -d premium24 -h 127.0.0.1
```

### Frontend not loading?
```bash
curl -I https://typingwork24.in
```

### Port 4000 in use?
```bash
sudo lsof -i :4000
```

---

## Summary of URLs After Deployment

- **Frontend:** https://typingwork24.in
- **Frontend Alt:** https://typingwork24.com
- **Backend API:** https://typingwork24.in/api/
- **Payment Integration:** Uses WatchPay API (via backend)
